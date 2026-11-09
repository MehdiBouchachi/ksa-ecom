import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { prepareCheckout } from "@/server/orders/checkout";
import { reconcileExpiredHolds } from "@/server/orders/reconcile";
import { MockPaymentProvider } from "@/server/payments/mock-provider";
import { setPaymentProviderForTests } from "@/server/payments/registry";
import { createPaymentSession, getCheckoutStatus, handlePaymentWebhook } from "@/server/payments/service";
import type { PaymentProvider, ProviderStatus } from "@/server/payments/provider";
import { processOutbox } from "@/server/notifications/outbox";
import { MemoryMailer, setMailerForTests } from "@/server/notifications/mailer";
import { checkoutInput, createUser, inv, key, resetDb, seedCatalog } from "../helpers/fixtures";
import { signedWebhook } from "../helpers/payments";

afterAll(() => closeDb());
beforeEach(async () => {
  await resetDb();
  MockPaymentProvider.reset();
  MemoryMailer.sent = [];
});
afterEach(() => {
  setPaymentProviderForTests(null);
  setMailerForTests(null);
});

async function orderRow(id: string) {
  const r = await getDb().execute<{ order_status: string; payment_status: string; shipping_status: string }>(
    sql`select order_status, payment_status, shipping_status from orders where id = ${id}`,
  );
  return r.rows[0]!;
}
const count = async (q: ReturnType<typeof sql>) => (await getDb().execute<{ n: number }>(q)).rows[0]!.n;

async function checkoutAndSession(stock = [5, 0, 0], qty = 1) {
  const { variants } = await seedCatalog({ stock });
  const u = await createUser();
  const { result } = await prepareCheckout(u, checkoutInput([{ variantId: variants[0]!.id, quantity: qty, purchaseMode: "RETAIL" }]), key());
  const session = await createPaymentSession(u.id, result.orderReference);
  return { u, variants, result, session };
}

describe("ACC-05/14 retail purchase via sandbox PSP", () => {
  it("prepare -> session -> signed PAID webhook -> confirmed order, stock consumed once, email sent", async () => {
    const { u, variants, result, session } = await checkoutAndSession([5, 0, 0], 2);
    expect(session.redirectUrl).toContain("/checkout/mock-pay/");
    // Session creation is idempotent.
    expect((await createPaymentSession(u.id, result.orderReference)).providerRef).toBe(session.providerRef);

    // Browser return alone proves nothing: still pending.
    expect((await getCheckoutStatus(u.id, result.orderReference)).paymentStatus).toBe("PENDING");

    const wh = signedWebhook({ providerRef: session.providerRef, status: "PAID", amountHalalas: result.totalHalalas, orderReference: result.orderReference });
    expect(await handlePaymentWebhook(wh.body, wh.headers)).toBe("PAID");

    // ACC-14: independent state machines.
    expect(await orderRow(result.orderId)).toEqual({ order_status: "CONFIRMED", payment_status: "PAID", shipping_status: "NOT_CREATED" });
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 3, reserved: 0 });

    const report = await processOutbox();
    expect(report.sent).toBe(2); // order received + payment confirmed
    expect(MemoryMailer.sent.map((m) => m.subject).join("|")).toMatch(/تم تأكيد الدفع/);
    expect((await processOutbox()).claimed).toBe(0); // never re-sent
  });

  it("rejects unsigned / tampered webhooks without touching the DB", async () => {
    const { result, session } = await checkoutAndSession();
    const wh = signedWebhook({ providerRef: session.providerRef, status: "PAID", amountHalalas: result.totalHalalas, orderReference: result.orderReference });
    const tampered = wh.body.replace(String(result.totalHalalas), "1");
    await expect(handlePaymentWebhook(tampered, wh.headers)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(handlePaymentWebhook(wh.body, new Headers())).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await count(sql`select count(*)::int as n from webhook_events`)).toBe(0);
  });

  it("amount mismatch never marks the order paid", async () => {
    const { result, session, variants } = await checkoutAndSession();
    const wh = signedWebhook({ providerRef: session.providerRef, status: "PAID", amountHalalas: result.totalHalalas - 100, orderReference: result.orderReference });
    expect(await handlePaymentWebhook(wh.body, wh.headers)).toBe("AMOUNT_MISMATCH");
    expect((await orderRow(result.orderId)).payment_status).toBe("PENDING");
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 5, reserved: 1 });
  });
});

describe("ACC-09 duplicate and out-of-order webhooks", () => {
  it("the same event delivered 8 times concurrently is applied exactly once", async () => {
    const { result, session, variants } = await checkoutAndSession([5, 0, 0], 2);
    const wh = signedWebhook({ providerRef: session.providerRef, status: "PAID", amountHalalas: result.totalHalalas, orderReference: result.orderReference });
    const outcomes = await Promise.all(Array.from({ length: 8 }, () => handlePaymentWebhook(wh.body, wh.headers)));
    expect(outcomes.filter((o) => o === "PAID")).toHaveLength(1);
    expect(outcomes.filter((o) => o === "DUPLICATE")).toHaveLength(7);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 3, reserved: 0 });
    expect(await count(sql`select count(*)::int as n from notification_outbox where kind = 'PAYMENT_CONFIRMED'`)).toBe(1);
    expect(await count(sql`select count(*)::int as n from inventory_adjustments where kind = 'SALE'`)).toBe(1);
    expect(await count(sql`select count(*)::int as n from orders`)).toBe(1);
  });

  it("a second PAID event with a different id is a no-op; FAILED after PAID is ignored", async () => {
    const { result, session, variants } = await checkoutAndSession();
    const d = { providerRef: session.providerRef, amountHalalas: result.totalHalalas, orderReference: result.orderReference };
    const a = signedWebhook({ ...d, status: "PAID" });
    const b = signedWebhook({ ...d, status: "PAID" });
    const f = signedWebhook({ ...d, status: "FAILED" });
    expect(await handlePaymentWebhook(a.body, a.headers)).toBe("PAID");
    expect(await handlePaymentWebhook(b.body, b.headers)).toBe("ALREADY_PAID");
    expect(await handlePaymentWebhook(f.body, f.headers)).toBe("FAILED_IGNORED");
    expect(await orderRow(result.orderId)).toMatchObject({ payment_status: "PAID", order_status: "CONFIRMED" });
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 4, reserved: 0 });
  });

  it("FAILED releases the hold once; a later verified PAID re-allocates if stock remains", async () => {
    const { result, session, variants } = await checkoutAndSession([3, 0, 0], 2);
    const d = { providerRef: session.providerRef, amountHalalas: result.totalHalalas, orderReference: result.orderReference };
    const f = signedWebhook({ ...d, status: "FAILED" });
    expect(await handlePaymentWebhook(f.body, f.headers)).toBe("FAILED_RELEASED");
    expect(await handlePaymentWebhook(f.body, f.headers)).toBe("DUPLICATE");
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 3, reserved: 0 });
    const p = signedWebhook({ ...d, status: "PAID" });
    expect(await handlePaymentWebhook(p.body, p.headers)).toBe("LATE_PAID_REALLOCATED");
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 1, reserved: 0 });
    expect(await orderRow(result.orderId)).toMatchObject({ payment_status: "PAID", order_status: "CONFIRMED" });
  });
});

/** Controllable fake PSP for reconciliation scenarios. */
class FakePsp implements PaymentProvider {
  readonly name = "mock";
  status: ProviderStatus = "INITIATED";
  amount = 0;
  ref = "";
  calls = 0;
  async createSession(i: { idempotencyKey: string; amountHalalas: number; orderReference: string }) {
    this.ref = `fake_${i.idempotencyKey}`;
    this.amount = i.amountHalalas;
    this.orderRef = i.orderReference;
    return { providerRef: this.ref, redirectUrl: "https://psp.test/pay" };
  }
  orderRef = "";
  verifyWebhook(): never {
    throw new Error("n/a");
  }
  async fetchStatus() {
    this.calls++;
    return { status: this.status, amountHalalas: this.amount, currency: "SAR", orderReference: this.orderRef };
  }
}

async function expireHolds() {
  await getDb().execute(sql`update stock_reservations set expires_at = now() - interval '2 hours' where status = 'ACTIVE'`);
  await getDb().execute(sql`update orders set reservation_expires_at = now() - interval '2 hours'`);
}

describe("ACC-08 hold expiry and late-payment reconciliation", () => {
  it("expires holds with no payment attempt and frees stock exactly once", async () => {
    const { variants } = await seedCatalog({ stock: [2, 0, 0] });
    const u = await createUser();
    const { result } = await prepareCheckout(u, checkoutInput([{ variantId: variants[0]!.id, quantity: 2, purchaseMode: "RETAIL" }]), key());
    await expireHolds();
    const [r1, r2] = await Promise.all([reconcileExpiredHolds(), reconcileExpiredHolds()]);
    expect(r1.expired + r2.expired).toBe(1);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 2, reserved: 0 });
    expect(await orderRow(result.orderId)).toMatchObject({ order_status: "CANCELLED" });
    await expect(createPaymentSession(u.id, result.orderReference)).rejects.toMatchObject({ code: "ORDER_EXPIRED" });
  });

  it("does NOT release while the PSP reports PROCESSING", async () => {
    const psp = new FakePsp();
    setPaymentProviderForTests(psp);
    const { result, variants } = await checkoutAndSession([2, 0, 0], 1);
    psp.status = "PROCESSING";
    await expireHolds();
    const r = await reconcileExpiredHolds();
    expect(r.skippedProcessing).toBe(1);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 2, reserved: 1 });
    expect((await orderRow(result.orderId)).order_status).toBe("PENDING");
  });

  it("recovers a captured payment whose webhook never arrived (consumes the hold)", async () => {
    const psp = new FakePsp();
    setPaymentProviderForTests(psp);
    const { result, variants } = await checkoutAndSession([2, 0, 0], 1);
    psp.status = "PAID";
    await expireHolds();
    const r = await reconcileExpiredHolds();
    expect(r.paidRecovered).toBe(1);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 1, reserved: 0 });
    expect(await orderRow(result.orderId)).toMatchObject({ payment_status: "PAID", order_status: "CONFIRMED" });
  });

  it("releases on PSP terminal failure", async () => {
    const psp = new FakePsp();
    setPaymentProviderForTests(psp);
    const { result, variants } = await checkoutAndSession([2, 0, 0], 1);
    psp.status = "FAILED";
    await expireHolds();
    expect((await reconcileExpiredHolds()).failedReleased).toBe(1);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 2, reserved: 0 });
    expect(await orderRow(result.orderId)).toMatchObject({ payment_status: "FAILED", order_status: "CANCELLED" });
  });

  it("late capture after release when stock was sold to someone else => REQUIRES_RECONCILIATION, no oversell", async () => {
    const { result, session, variants } = await checkoutAndSession([1, 0, 0], 1);
    await expireHolds();
    await reconcileExpiredHolds(); // INITIATED past grace -> abandoned -> released
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 1, reserved: 0 });
    // Another customer buys and pays for the last unit.
    const other = await createUser();
    const o2 = await prepareCheckout(other, checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" }]), key());
    const s2 = await createPaymentSession(other.id, o2.result.orderReference);
    const w2 = signedWebhook({ providerRef: s2.providerRef, status: "PAID", amountHalalas: o2.result.totalHalalas, orderReference: o2.result.orderReference });
    expect(await handlePaymentWebhook(w2.body, w2.headers)).toBe("PAID");
    // The original customer's payment is captured late.
    const late = signedWebhook({ providerRef: session.providerRef, status: "PAID", amountHalalas: result.totalHalalas, orderReference: result.orderReference });
    expect(await handlePaymentWebhook(late.body, late.headers)).toBe("LATE_PAID_REQUIRES_RECONCILIATION");
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 0, reserved: 0 });
    expect(await orderRow(result.orderId)).toMatchObject({ payment_status: "PAID", order_status: "REQUIRES_RECONCILIATION" });
    expect(await count(sql`select count(*)::int as n from notification_outbox where kind = 'STAFF_ALERT'`)).toBe(1);
  });

  it("expiry vs paid webhook race: stock consumed or released, never both", async () => {
    for (let i = 0; i < 5; i++) {
      await resetDb();
      MockPaymentProvider.reset();
      const { result, session, variants } = await checkoutAndSession([1, 0, 0], 1);
      await expireHolds();
      MockPaymentProvider.setStatus(session.providerRef, "INITIATED");
      const wh = signedWebhook({ providerRef: session.providerRef, status: "PAID", amountHalalas: result.totalHalalas, orderReference: result.orderReference });
      await Promise.all([reconcileExpiredHolds(), handlePaymentWebhook(wh.body, wh.headers)]);
      const s = await inv(variants[0]!.id);
      const o = await orderRow(result.orderId);
      expect(s.reserved).toBe(0);
      expect(o.payment_status).toBe("PAID");
      expect(o.order_status).toBe("CONFIRMED");
      expect(s.onHand).toBe(0); // exactly one unit sold
      expect(await count(sql`select count(*)::int as n from inventory_adjustments where kind='SALE'`)).toBe(1);
    }
  });
});

describe("ACC-17 outbox retries", () => {
  it("retries failed sends with backoff and never duplicates delivered mail", async () => {
    let fail = true;
    setMailerForTests({
      async send(to, msg) {
        if (fail) throw new Error("smtp down");
        MemoryMailer.sent.push({ to, subject: msg.subject, text: msg.text });
      },
    });
    await checkoutAndSession();
    const r1 = await processOutbox();
    expect(r1).toMatchObject({ claimed: 1, retried: 1, sent: 0 });
    fail = false;
    await getDb().execute(sql`update notification_outbox set next_attempt_at = now() - interval '1 second'`);
    const [a, b] = await Promise.all([processOutbox(), processOutbox()]); // SKIP LOCKED => no double send
    expect(a.sent + b.sent).toBe(1);
    expect(MemoryMailer.sent).toHaveLength(1);
  });
});
