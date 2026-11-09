import { describe, expect, it } from "vitest";
import { computeQuote, normalizeLines, resolveUnitPrice, taxOf, type VariantPricing } from "@/server/pricing/engine";
import { rangesOverlap } from "@/server/admin/catalog";

const v = (tiers: VariantPricing["tiers"] = [], sellable = true): VariantPricing => ({ variantId: "v1", sellable, retailPriceHalalas: 10000, tiers });
const bulk = [
  { id: "t1", mode: "BULK" as const, minQty: 10, maxQty: 49, unitPriceHalalas: 8000, active: true },
  { id: "t2", mode: "BULK" as const, minQty: 50, maxQty: null, unitPriceHalalas: 7000, active: true },
];
const settings = { vatRateBps: 1500, pricesIncludeVat: true, shippingFlatHalalas: 2500, freeShippingThresholdHalalas: 100000 };

describe("pricing engine", () => {
  it("retail uses variant price; bulk enforces MOQ and inclusive tier bounds", () => {
    expect(resolveUnitPrice(v(bulk), "RETAIL", 1).unit).toBe(10000);
    expect(() => resolveUnitPrice(v(bulk), "BULK", 9)).toThrow(/الحد الأدنى/);
    expect(resolveUnitPrice(v(bulk), "BULK", 10).unit).toBe(8000);
    expect(resolveUnitPrice(v(bulk), "BULK", 49).unit).toBe(8000);
    expect(resolveUnitPrice(v(bulk), "BULK", 50).unit).toBe(7000);
    expect(resolveUnitPrice(v(bulk), "BULK", 10_000).unit).toBe(7000);
  });
  it("gaps between bulk tiers are rejected; inactive tiers ignored; unsellable variants rejected", () => {
    const gap = [bulk[0]!, { ...bulk[1]!, minQty: 60 }];
    expect(() => resolveUnitPrice(v(gap), "BULK", 55)).toThrow();
    expect(() => resolveUnitPrice(v([{ ...bulk[0]!, active: false }]), "BULK", 20)).toThrow();
    expect(() => resolveUnitPrice(v([], false), "RETAIL", 1)).toThrow();
  });
  it("merges duplicate lines per variant+mode only", () => {
    expect(
      normalizeLines([
        { variantId: "a", quantity: 1, purchaseMode: "RETAIL" },
        { variantId: "a", quantity: 2, purchaseMode: "RETAIL" },
        { variantId: "a", quantity: 10, purchaseMode: "BULK" },
        { variantId: "b", quantity: 1, purchaseMode: "RETAIL" },
      ]),
    ).toHaveLength(3);
  });
  it("VAT rounding half-up, inclusive and exclusive", () => {
    expect(taxOf(10000, { vatRateBps: 1500, pricesIncludeVat: true })).toBe(1304); // 1304.35
    expect(taxOf(115, { vatRateBps: 1500, pricesIncludeVat: true })).toBe(15);
    expect(taxOf(10000, { vatRateBps: 1500, pricesIncludeVat: false })).toBe(1500);
    expect(taxOf(3, { vatRateBps: 1500, pricesIncludeVat: false })).toBe(0); // 0.45
    expect(taxOf(10, { vatRateBps: 1500, pricesIncludeVat: false })).toBe(2); // 1.5 -> 2
  });
  it("computes totals, free shipping threshold, exclusive VAT", () => {
    const m = new Map([["v1", v(bulk)]]);
    const q = computeQuote([{ variantId: "v1", quantity: 2, purchaseMode: "RETAIL" }], m, settings);
    expect(q).toMatchObject({ subtotalHalalas: 20000, shippingHalalas: 2500, totalHalalas: 22500 });
    const free = computeQuote([{ variantId: "v1", quantity: 10, purchaseMode: "RETAIL" }], m, settings);
    expect(free.shippingHalalas).toBe(0);
    const ex = computeQuote([{ variantId: "v1", quantity: 1, purchaseMode: "RETAIL" }], m, { ...settings, pricesIncludeVat: false });
    expect(ex).toMatchObject({ subtotalHalalas: 10000, taxHalalas: 1500 + 375, totalHalalas: 10000 + 2500 + 1875 });
    expect(() => computeQuote([{ variantId: "v1", quantity: 1, purchaseMode: "RETAIL" }], m, { ...settings, shippingFlatHalalas: null })).toThrow();
    expect(() => computeQuote([{ variantId: "zz", quantity: 1, purchaseMode: "RETAIL" }], m, settings)).toThrow();
  });
  it("tier overlap detection (inclusive, open-ended)", () => {
    expect(rangesOverlap({ minQty: 10, maxQty: 49 }, { minQty: 50, maxQty: null })).toBe(false);
    expect(rangesOverlap({ minQty: 10, maxQty: 50 }, { minQty: 50, maxQty: null })).toBe(true);
    expect(rangesOverlap({ minQty: 100, maxQty: null }, { minQty: 50, maxQty: null })).toBe(true);
  });
});
