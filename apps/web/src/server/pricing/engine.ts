import { roundHalfUpDiv, type PurchaseMode, type Quote, type QuoteLine } from "@saudi-ecom/contracts";
import { AppError } from "../lib/errors";

/** Pure pricing engine — no I/O. All money in integer halalas. */
export type TierRow = { id: string; mode: PurchaseMode; minQty: number; maxQty: number | null; unitPriceHalalas: number; active: boolean };
export type VariantPricing = {
  variantId: string;
  sellable: boolean; // variant active AND product active AND color/size active
  retailPriceHalalas: number;
  tiers: TierRow[];
};
export type PricingSettings = {
  vatRateBps: number;
  pricesIncludeVat: boolean;
  shippingFlatHalalas: number | null;
  freeShippingThresholdHalalas: number | null;
};
export type LineInput = { variantId: string; quantity: number; purchaseMode: PurchaseMode };

const MAX_LINE_HALALAS = 1_000_000_000_00; // 1bn SAR sanity cap; keeps arithmetic in safe-integer range

export function bulkMinimum(tiers: TierRow[]): number | null {
  const bulk = tiers.filter((t) => t.active && t.mode === "BULK");
  return bulk.length ? Math.min(...bulk.map((t) => t.minQty)) : null;
}

function inTier(t: TierRow, qty: number) {
  return t.active && qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty);
}

export function resolveUnitPrice(v: VariantPricing, mode: PurchaseMode, qty: number): { unit: number; tier: TierRow | null } {
  if (!v.sellable) throw new AppError("INVALID_VARIANT", "هذا الخيار غير متاح للبيع", { variantId: v.variantId });
  if (!Number.isInteger(qty) || qty < 1) throw new AppError("INVALID_QUANTITY", "كمية غير صالحة");
  const tiers = v.tiers.filter((t) => t.mode === mode && t.active);
  if (mode === "RETAIL") {
    const tier = tiers.find((t) => inTier(t, qty)) ?? null;
    return { unit: tier ? tier.unitPriceHalalas : v.retailPriceHalalas, tier };
  }
  const moq = bulkMinimum(v.tiers);
  if (moq === null) throw new AppError("BULK_MINIMUM_NOT_MET", "الشراء بالجملة غير متاح لهذا الخيار", { variantId: v.variantId });
  if (qty < moq) throw new AppError("BULK_MINIMUM_NOT_MET", `الحد الأدنى لطلب الجملة ${moq}`, { variantId: v.variantId, minimum: moq });
  const tier = tiers.find((t) => inTier(t, qty));
  if (!tier) throw new AppError("INVALID_QUANTITY", "الكمية خارج شرائح أسعار الجملة المتاحة", { variantId: v.variantId });
  return { unit: tier.unitPriceHalalas, tier };
}

/** Merge duplicate (variant, mode) lines. Different variants are never aggregated together. */
export function normalizeLines(lines: LineInput[]): LineInput[] {
  const map = new Map<string, LineInput>();
  for (const l of lines) {
    const k = `${l.variantId}|${l.purchaseMode}`;
    const prev = map.get(k);
    map.set(k, prev ? { ...prev, quantity: prev.quantity + l.quantity } : { ...l });
  }
  return [...map.values()];
}

export function taxOf(amount: number, s: Pick<PricingSettings, "vatRateBps" | "pricesIncludeVat">): number {
  if (s.vatRateBps === 0 || amount === 0) return 0;
  return s.pricesIncludeVat
    ? roundHalfUpDiv(amount * s.vatRateBps, 10_000 + s.vatRateBps)
    : roundHalfUpDiv(amount * s.vatRateBps, 10_000);
}

export function computeQuote(input: LineInput[], variants: Map<string, VariantPricing>, s: PricingSettings): Quote {
  const lines = normalizeLines(input);
  const items: QuoteLine[] = lines.map((l) => {
    const v = variants.get(l.variantId);
    if (!v) throw new AppError("INVALID_VARIANT", "منتج غير موجود", { variantId: l.variantId });
    const { unit, tier } = resolveUnitPrice(v, l.purchaseMode, l.quantity);
    const lineTotal = unit * l.quantity;
    if (!Number.isSafeInteger(lineTotal) || lineTotal > MAX_LINE_HALALAS) throw new AppError("INVALID_QUANTITY", "قيمة السطر كبيرة جدًا");
    return {
      variantId: l.variantId,
      quantity: l.quantity,
      purchaseMode: l.purchaseMode,
      unitPriceHalalas: unit,
      lineTotalHalalas: lineTotal,
      taxHalalas: taxOf(lineTotal, s),
      tierId: tier?.id ?? null,
      tierMinQty: tier?.minQty ?? null,
      tierMaxQty: tier?.maxQty ?? null,
    };
  });
  const subtotal = items.reduce((a, i) => a + i.lineTotalHalalas, 0);
  if (s.shippingFlatHalalas === null) throw new AppError("NOT_CONFIGURED", "لم يتم إعداد أسعار الشحن بعد");
  const freeShip = s.freeShippingThresholdHalalas !== null && subtotal >= s.freeShippingThresholdHalalas;
  const shipping = freeShip ? 0 : s.shippingFlatHalalas;
  const tax = items.reduce((a, i) => a + i.taxHalalas, 0) + taxOf(shipping, s);
  const total = s.pricesIncludeVat ? subtotal + shipping : subtotal + shipping + tax;
  return {
    currency: "SAR",
    items,
    subtotalHalalas: subtotal,
    shippingHalalas: shipping,
    taxHalalas: tax,
    totalHalalas: total,
    pricesIncludeVat: s.pricesIncludeVat,
    vatRateBps: s.vatRateBps,
  };
}
