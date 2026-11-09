import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { prepareCheckout } from "@/server/orders/checkout";
import { cancelOrder, changeOrderStatus } from "@/server/orders/queries";
import { createPaymentSession, handlePaymentWebhook } from "@/server/payments/service";
import { MockAramexProvider } from "@/server/shipping/mock-aramex";
import { createShipmentForOrder, getTrackingForUser, syncShipments } from "@/server/shipping/service";
import { checkoutInput, createUser, inv, key, resetDb, seedCatalog } from "../helpers/fixtures";
import { signedWebhook } from "../helpers/payments";

afterAll(() => closeDb());
beforeEach(async () => {
  await resetDb();
  MockAramexProvider.reset();
});

async function paidOrder(stock = [5, 0, 0]) {
  const { variants } = await seedCatalog({ stock });
  const buyer = await createUser();
  const { result } = await prepareCheckout(buyer, checkoutInput([{ variantId: variants[0]!.id, quantity: 2, purchaseMode: "RETAIL" }]), key());
  const s = await createPaymentSession(buyer.id, result.orderReference);
  const wh = signedWebhook({ providerRef: s.providerRef, status: "PAID", amountHalalas: result.totalHalalas, orderReference: result.orderReference });
  await handlePaymentWebhook(wh.body, wh.headers);
  return { buyer, result, variants };
}

describe("ACC-13 Aramex shipment exactly once", () => {
  it("unpaid orders cannot be shipped", async () => {
    const { variants } = await seedCatalog();
    const [buyer, admin] = await Promise.all([createUser(), createUser("ADMIN")]);
    const { result } = await prepareCheckout(buyer, checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" }]), key());
    await expect(createShipmentForOrder(result.orderId, admin.id)).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
  });

  it("10 concurrent create clicks => one shipment, one AWB; owner sees tracking, others do not", async () => {
    const { buyer, result } = await paidOrder();
    const admin = await createUser("ADMIN");
    const res = await Promise.allSettled(Array.from({ length: 10 }, () => createShipmentForOrder(result.orderId, admin.id)));
    const awbs = new Set(res.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<{ shipment: { awb: string | null } }>).value.shipment.awb));
    expect(awbs.size).toBe(1);
    expect(MockAramexProvider.stats().created).toBe(1);
    const count = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from shipments`);
    expect(count.rows[0]!.n).toBe(1);
    expect((await getDb().execute<{ n: number }>(sql`select count(*)::int as n from notification_outbox where kind='ORDER_SHIPPED'`)).rows[0]!.n).toBe(1);

    const again = await createShipmentForOrder(result.orderId, admin.id);
    expect(again.created).toBe(false);

    const t = await getTrackingForUser(buyer.id, result.orderId);
    expect(t?.shipment?.awb).toBe([...awbs][0]);
    const stranger = await createUser();
    expect(await getTrackingForUser(stranger.id, result.orderId)).toBeNull();
  });

  it("tracking sync advances statuses monotonically and drives order status; out-of-order events don't regress", async () => {
    const { result } = await paidOrder();
    const admin = await createUser("ADMIN");
    const { shipment } = await createShipmentForOrder(result.orderId, admin.id);
    const awb = shipment.awb!;
    const t0 = Date.now();
    MockAramexProvider.push(awb, { key: `${awb}:3`, status: "IN_TRANSIT", description: "في الطريق", occurredAt: new Date(t0 + 3000) });
    MockAramexProvider.push(awb, { key: `${awb}:2`, status: "PICKED_UP", description: "تم الاستلام", occurredAt: new Date(t0 + 2000) });
    await getDb().execute(sql`update shipments set last_synced_at = null`);
    expect((await syncShipments()).synced).toBe(1);
    let o = (await getDb().execute<{ order_status: string; shipping_status: string; payment_status: string }>(sql`select order_status, shipping_status, payment_status from orders`)).rows[0]!;
    expect(o).toEqual({ order_status: "SHIPPED", shipping_status: "IN_TRANSIT", payment_status: "PAID" });
    MockAramexProvider.push(awb, { key: `${awb}:5`, status: "DELIVERED", description: "تم التسليم", occurredAt: new Date(t0 + 5000) });
    await getDb().execute(sql`update shipments set last_synced_at = null`);
    await syncShipments();
    await syncShipments(); // idempotent
    o = (await getDb().execute<{ order_status: string; shipping_status: string; payment_status: string }>(sql`select order_status, shipping_status, payment_status from orders`)).rows[0]!;
    expect(o).toEqual({ order_status: "DELIVERED", shipping_status: "DELIVERED", payment_status: "PAID" });
    expect((await getDb().execute<{ n: number }>(sql`select count(*)::int as n from shipment_events`)).rows[0]!.n).toBe(4);
  });
});

describe("cancellation / return restock exactly once", () => {
  it("cancelling a paid order restocks once; returning after delivery restocks once", async () => {
    const { result, variants } = await paidOrder();
    const admin = await createUser("ADMIN");
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 3, reserved: 0 });
    const r = await cancelOrder(result.orderId, admin, "customer request", true);
    expect(r).toMatchObject({ restocked: 1, refundRequired: true });
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 5, reserved: 0 });
    await expect(cancelOrder(result.orderId, admin, "again", true)).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 5, reserved: 0 });
  });

  it("manual transitions are validated", async () => {
    const { result } = await paidOrder();
    const manager = await createUser("MANAGER");
    await expect(changeOrderStatus(result.orderId, "DELIVERED", manager)).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
    await changeOrderStatus(result.orderId, "PROCESSING", manager);
    await expect(changeOrderStatus(result.orderId, "CONFIRMED", manager)).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
  });
});
