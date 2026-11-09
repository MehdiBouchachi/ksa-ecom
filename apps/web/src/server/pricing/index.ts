import { and, eq, inArray } from "drizzle-orm";
import type { PurchaseMode } from "@saudi-ecom/contracts";
import { getDb, type Executor } from "../db";
import { colors, priceTiers, productVariants, products, sizes } from "../db/schema";
import { getSetting } from "../lib/settings";
import { computeQuote, type LineInput, type VariantPricing } from "./engine";

export * from "./engine";

export type VariantInfo = VariantPricing & {
  sku: string;
  productName: string;
  colorName: string;
  sizeName: string;
};

/** Loads authoritative variant pricing data from PostgreSQL (never from the browser). */
export async function loadVariantPricing(variantIds: string[], exec: Executor = getDb()): Promise<Map<string, VariantInfo>> {
  const ids = [...new Set(variantIds)];
  if (!ids.length) return new Map();
  const rows = await exec
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      price: productVariants.retailPriceHalalas,
      vActive: productVariants.active,
      pActive: products.active,
      cActive: colors.active,
      sActive: sizes.active,
      productName: products.name,
      colorName: colors.name,
      sizeName: sizes.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(colors, eq(colors.id, productVariants.colorId))
    .innerJoin(sizes, eq(sizes.id, productVariants.sizeId))
    .where(inArray(productVariants.id, ids));
  const tiers = await exec
    .select()
    .from(priceTiers)
    .where(and(inArray(priceTiers.variantId, ids), eq(priceTiers.active, true)));
  const map = new Map<string, VariantInfo>();
  for (const r of rows) {
    map.set(r.variantId, {
      variantId: r.variantId,
      sku: r.sku,
      sellable: r.vActive && r.pActive && r.cActive && r.sActive,
      retailPriceHalalas: r.price,
      productName: r.productName,
      colorName: r.colorName,
      sizeName: r.sizeName,
      tiers: tiers
        .filter((t) => t.variantId === r.variantId)
        .map((t) => ({ id: t.id, mode: t.mode as PurchaseMode, minQty: t.minQty, maxQty: t.maxQty, unitPriceHalalas: t.unitPriceHalalas, active: t.active }))
        .sort((a, b) => a.minQty - b.minQty),
    });
  }
  return map;
}

/** Preview quote (POST /api/v1/pricing/quote). Does NOT reserve stock. */
export async function quoteCart(items: LineInput[], exec: Executor = getDb()) {
  const [variants, commerce] = await Promise.all([loadVariantPricing(items.map((i) => i.variantId), exec), getSetting("commerce", exec)]);
  return computeQuote(items, variants, commerce);
}
