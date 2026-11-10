import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { addTier, addTiersBatch } from "@/server/admin/catalog";
import { closeDb, getDb } from "@/server/db";
import { priceTiers } from "@/server/db/schema";
import { createUser, resetDb, seedCatalog } from "../helpers/fixtures";

afterAll(() => closeDb());
beforeEach(() => resetDb());

const activeTiers = (variantId: string) =>
  getDb().select().from(priceTiers).where(and(eq(priceTiers.variantId, variantId), eq(priceTiers.active, true)));

describe("admin: batch wholesale tiers", () => {
  it("adds the same tier to every selected variant", async () => {
    const admin = await createUser("ADMIN");
    const { variants } = await seedCatalog();
    const res = await addTiersBatch(admin.id, { variantIds: variants.map((v) => v.id), mode: "BULK", minQty: 10, maxQty: null, unitPriceHalalas: 8000 });
    expect(res).toEqual({ count: 3 });
    for (const v of variants) expect(await activeTiers(v.id)).toHaveLength(1);
  });

  it("is all-or-nothing and names only the conflicting SKUs", async () => {
    const admin = await createUser("ADMIN");
    const { variants } = await seedCatalog();
    const [a, b, c] = variants;
    await addTier(admin.id, { variantId: b!.id, mode: "BULK", minQty: 20, maxQty: 40, unitPriceHalalas: 7000 });
    await expect(
      addTiersBatch(admin.id, { variantIds: [a!.id, b!.id, c!.id], mode: "BULK", minQty: 30, maxQty: null, unitPriceHalalas: 6500 }),
    ).rejects.toMatchObject({ code: "CONFLICT", details: { conflicts: [b!.sku] } });
    // Nothing written for the non-conflicting variants either.
    expect(await activeTiers(a!.id)).toHaveLength(0);
    expect(await activeTiers(c!.id)).toHaveLength(0);
    expect(await activeTiers(b!.id)).toHaveLength(1);
  });

  it("does not treat the other purchase mode as an overlap", async () => {
    const admin = await createUser("ADMIN");
    const { variants } = await seedCatalog();
    await addTier(admin.id, { variantId: variants[0]!.id, mode: "BULK", minQty: 5, maxQty: null, unitPriceHalalas: 7000 });
    await expect(addTiersBatch(admin.id, { variantIds: [variants[0]!.id], mode: "RETAIL", minQty: 5, maxQty: 9, unitPriceHalalas: 9500 })).resolves.toEqual({ count: 1 });
  });

  it("rejects invalid input before touching the database", async () => {
    const admin = await createUser("ADMIN");
    const { variants } = await seedCatalog();
    await expect(addTiersBatch(admin.id, { variantIds: [], mode: "BULK", minQty: 5, maxQty: null, unitPriceHalalas: 7000 })).rejects.toThrow();
    await expect(addTiersBatch(admin.id, { variantIds: [variants[0]!.id], mode: "BULK", minQty: 10, maxQty: 5, unitPriceHalalas: 7000 })).rejects.toThrow();
    await expect(addTiersBatch(admin.id, { variantIds: [variants[0]!.id], mode: "BULK", minQty: 1, maxQty: null, unitPriceHalalas: 0 })).rejects.toThrow();
  });
});
