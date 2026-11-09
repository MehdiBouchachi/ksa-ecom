import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/server/db";
import { adjustStock } from "@/server/inventory";
import { prepareCheckout } from "@/server/orders/checkout";
import { AppError } from "@/server/lib/errors";
import { addBulkTiers, checkoutInput, createUser, inv, key, resetDb, seedCatalog } from "../helpers/fixtures";

afterAll(() => closeDb());
beforeEach(() => resetDb());

const codeOf = (r: PromiseSettledResult<unknown>) => (r.status === "rejected" ? (r.reason as AppError).code : "OK");

describe("ACC-07 last unit / concurrency (real PostgreSQL row locks)", () => {
  it("two customers racing for the last unit: exactly one reservation", async () => {
    const { variants } = await seedCatalog({ stock: [1, 10, 10] });
    const [a, b] = await Promise.all([createUser(), createUser()]);
    const item = [{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" as const }];
    const results = await Promise.allSettled([prepareCheckout(a, checkoutInput(item), key()), prepareCheckout(b, checkoutInput(item), key())]);
    expect(results.map(codeOf).sort()).toEqual(["OK", "STOCK_UNAVAILABLE"]);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 1, reserved: 1 });
  });

  it("50 concurrent attempts against 7 units: exactly 7 succeed, never oversold", async () => {
    const { variants } = await seedCatalog({ stock: [7, 10, 10] });
    const buyers = await Promise.all(Array.from({ length: 50 }, () => createUser()));
    const item = [{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" as const }];
    const results = await Promise.allSettled(buyers.map((u) => prepareCheckout(u, checkoutInput(item), key())));
    const codes = results.map(codeOf);
    expect(codes.filter((c) => c === "OK")).toHaveLength(7);
    expect(codes.filter((c) => c === "STOCK_UNAVAILABLE")).toHaveLength(43);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 7, reserved: 7 });
    const res = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from stock_reservations where status = 'ACTIVE'`);
    expect(res.rows[0]!.n).toBe(7);
  });

  it("multi-line cart is all-or-nothing", async () => {
    const { variants } = await seedCatalog({ stock: [10, 2, 10] });
    const u = await createUser();
    const items = [
      { variantId: variants[0]!.id, quantity: 3, purchaseMode: "RETAIL" as const },
      { variantId: variants[1]!.id, quantity: 5, purchaseMode: "RETAIL" as const },
    ];
    await expect(prepareCheckout(u, checkoutInput(items), key())).rejects.toMatchObject({ code: "STOCK_UNAVAILABLE" });
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 10, reserved: 0 });
    expect(await inv(variants[1]!.id)).toEqual({ onHand: 2, reserved: 0 });
    const res = await getDb().execute<{ n: number }>(sql`select count(*)::int as n from orders`);
    expect(res.rows[0]!.n).toBe(0);
  });

  it("opposite-order multi-variant carts do not deadlock (sorted locking)", async () => {
    const { variants } = await seedCatalog({ stock: [100, 100, 100] });
    const users = await Promise.all(Array.from({ length: 20 }, () => createUser()));
    const v = variants.map((x) => x.id);
    const results = await Promise.allSettled(
      users.map((u, i) => {
        const order = i % 2 ? [v[0]!, v[1]!, v[2]!] : [v[2]!, v[1]!, v[0]!];
        return prepareCheckout(u, checkoutInput(order.map((variantId) => ({ variantId, quantity: 1, purchaseMode: "RETAIL" as const }))), key());
      }),
    );
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    for (const id of v) expect(await inv(id)).toEqual({ onHand: 100, reserved: 20 });
  });

  it("retail and bulk share the same stock pool", async () => {
    const { variants } = await seedCatalog({ stock: [12, 0, 0] });
    await addBulkTiers(variants[0]!.id);
    const [a, b] = await Promise.all([createUser(), createUser()]);
    await prepareCheckout(a, checkoutInput([{ variantId: variants[0]!.id, quantity: 10, purchaseMode: "BULK" }]), key());
    await expect(
      prepareCheckout(b, checkoutInput([{ variantId: variants[0]!.id, quantity: 3, purchaseMode: "RETAIL" }]), key()),
    ).rejects.toMatchObject({ code: "STOCK_UNAVAILABLE" });
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 12, reserved: 10 });
  });
});

describe("checkout idempotency", () => {
  it("same Idempotency-Key replays the same order and reserves once (also under concurrency)", async () => {
    const { variants } = await seedCatalog({ stock: [5, 0, 0] });
    const u = await createUser();
    const k = key();
    const input = checkoutInput([{ variantId: variants[0]!.id, quantity: 2, purchaseMode: "RETAIL" }]);
    const results = await Promise.all(Array.from({ length: 6 }, () => prepareCheckout(u, input, k)));
    const ids = new Set(results.map((r) => r.result.orderId));
    expect(ids.size).toBe(1);
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 5, reserved: 2 });
  });

  it("re-using a key with a different body is rejected", async () => {
    const { variants } = await seedCatalog();
    const u = await createUser();
    const k = key();
    await prepareCheckout(u, checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" }]), k);
    await expect(prepareCheckout(u, checkoutInput([{ variantId: variants[0]!.id, quantity: 2, purchaseMode: "RETAIL" }]), k)).rejects.toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED",
    });
  });

  it("server ignores client prices: totals come from DB; terms version enforced; shipping must be configured", async () => {
    const { variants } = await seedCatalog();
    const u = await createUser();
    const { result } = await prepareCheckout(u, checkoutInput([{ variantId: variants[0]!.id, quantity: 3, purchaseMode: "RETAIL" }]), key());
    expect(result.subtotalHalalas).toBe(30000);
    expect(result.shippingHalalas).toBe(2500);
    expect(result.totalHalalas).toBe(32500); // VAT-inclusive prices
    expect(result.taxHalalas).toBe(3913 + 326); // 30000*15/115 + 2500*15/115, half-up per line
    const bad = { ...checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" as const }]), acceptedTermsVersion: "old" };
    await expect(prepareCheckout(u, bad, key())).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("refuses checkout when shipping rates are not configured (no invented rates)", async () => {
    const { variants } = await seedCatalog({ shippingFlatHalalas: null });
    const u = await createUser();
    await expect(prepareCheckout(u, checkoutInput([{ variantId: variants[0]!.id, quantity: 1, purchaseMode: "RETAIL" }]), key())).rejects.toMatchObject({
      code: "NOT_CONFIGURED",
    });
    expect(await inv(variants[0]!.id)).toEqual({ onHand: 10, reserved: 0 });
  });
});

describe("ACC-06 wholesale MOQ and tier boundaries", () => {
  it("enforces MOQ and picks the right tier at each boundary", async () => {
    const { variants } = await seedCatalog({ stock: [1000, 0, 0] });
    const id = variants[0]!.id;
    await addBulkTiers(id);
    const u = await createUser();
    await expect(prepareCheckout(u, checkoutInput([{ variantId: id, quantity: 9, purchaseMode: "BULK" }]), key())).rejects.toMatchObject({
      code: "BULK_MINIMUM_NOT_MET",
    });
    const cases: [number, number][] = [
      [10, 8000],
      [49, 8000],
      [50, 7000],
      [199, 7000],
      [200, 6000],
    ];
    for (const [qty, unit] of cases) {
      const { result } = await prepareCheckout(u, checkoutInput([{ variantId: id, quantity: qty, purchaseMode: "BULK" }]), key());
      expect(result.items[0]!.unitPriceHalalas).toBe(unit);
    }
  });

  it("bulk is unavailable for variants without bulk tiers", async () => {
    const { variants } = await seedCatalog();
    const u = await createUser();
    await expect(prepareCheckout(u, checkoutInput([{ variantId: variants[1]!.id, quantity: 100, purchaseMode: "BULK" }]), key())).rejects.toMatchObject({
      code: "BULK_MINIMUM_NOT_MET",
    });
  });
});

describe("ACC-12 audited stock adjustments", () => {
  it("cannot reduce on_hand below reserved units; ledger records every change", async () => {
    const { variants } = await seedCatalog({ stock: [5, 0, 0] });
    const id = variants[0]!.id;
    const [admin, buyer] = await Promise.all([createUser("ADMIN"), createUser()]);
    await prepareCheckout(buyer, checkoutInput([{ variantId: id, quantity: 3, purchaseMode: "RETAIL" }]), key());
    await expect(adjustStock({ variantId: id, delta: -3, reason: "damaged", actorId: admin.id })).rejects.toMatchObject({ code: "CONFLICT" });
    const ok = await adjustStock({ variantId: id, delta: -2, reason: "damaged", actorId: admin.id });
    expect(ok).toMatchObject({ onHand: 3, reserved: 3, available: 0 });
    await adjustStock({ variantId: id, delta: 4, reason: "restock", actorId: admin.id });
    const ledger = await getDb().execute<{ delta: number; actor_id: string }>(sql`select delta, actor_id from inventory_adjustments where variant_id = ${id} order by created_at`);
    expect(ledger.rows.map((r) => r.delta)).toEqual([-2, 4]);
    // Append-only: updates/deletes are blocked at the DB level.
    await expect(getDb().execute(sql`delete from inventory_adjustments`)).rejects.toThrow();
  });

  it("concurrent admin adjustments and checkouts keep invariants", async () => {
    const { variants } = await seedCatalog({ stock: [20, 0, 0] });
    const id = variants[0]!.id;
    const admin = await createUser("ADMIN");
    const buyers = await Promise.all(Array.from({ length: 15 }, () => createUser()));
    const ops = [
      ...buyers.map((b) => prepareCheckout(b, checkoutInput([{ variantId: id, quantity: 2, purchaseMode: "RETAIL" }]), key())),
      ...Array.from({ length: 10 }, (_, i) => adjustStock({ variantId: id, delta: i % 2 ? 3 : -3, reason: "count", actorId: admin.id })),
    ];
    await Promise.allSettled(ops);
    const { onHand, reserved } = await inv(id);
    expect(onHand).toBeGreaterThanOrEqual(reserved);
    expect(reserved).toBeGreaterThanOrEqual(0);
    const sum = await getDb().execute<{ s: number }>(sql`select coalesce(sum(quantity),0)::int as s from stock_reservations where variant_id = ${id} and status='ACTIVE'`);
    expect(sum.rows[0]!.s).toBe(reserved);
    const led = await getDb().execute<{ s: number }>(sql`select coalesce(sum(delta),0)::int as s from inventory_adjustments where variant_id = ${id}`);
    expect(20 + led.rows[0]!.s).toBe(onHand);
  });

  it("DB constraints reject impossible inventory states even if app code were bypassed", async () => {
    const { variants } = await seedCatalog({ stock: [1, 0, 0] });
    await expect(getDb().execute(sql`update inventory set reserved = 2 where variant_id = ${variants[0]!.id}`)).rejects.toThrow();
    await expect(getDb().execute(sql`update inventory set on_hand = -1 where variant_id = ${variants[0]!.id}`)).rejects.toThrow();
  });
});
