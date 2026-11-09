import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { colors, inventory, productVariants, products, sizes, wishlists } from "../db/schema";
import { AppError } from "../lib/errors";

/** All wishlist queries are constrained by the authenticated user's id. */
export async function listWishlist(userId: string) {
  return getDb()
    .select({
      id: wishlists.id,
      variantId: wishlists.variantId,
      sku: productVariants.sku,
      productSlug: products.slug,
      productName: products.name,
      colorName: colors.name,
      colorSlug: colors.slug,
      swatchHex: colors.swatchHex,
      sizeName: sizes.name,
      priceHalalas: productVariants.retailPriceHalalas,
      active: productVariants.active,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      createdAt: wishlists.createdAt,
    })
    .from(wishlists)
    .innerJoin(productVariants, eq(productVariants.id, wishlists.variantId))
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(colors, eq(colors.id, productVariants.colorId))
    .innerJoin(sizes, eq(sizes.id, productVariants.sizeId))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(eq(wishlists.userId, userId))
    .orderBy(desc(wishlists.createdAt));
}

export async function addToWishlist(userId: string, variantId: string) {
  const [v] = await getDb().select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.id, variantId));
  if (!v) throw new AppError("INVALID_VARIANT", "خيار غير موجود");
  const [row] = await getDb().insert(wishlists).values({ userId, variantId }).onConflictDoNothing().returning({ id: wishlists.id });
  if (row) return row;
  const [existing] = await getDb().select({ id: wishlists.id }).from(wishlists).where(and(eq(wishlists.userId, userId), eq(wishlists.variantId, variantId)));
  return existing!;
}

/** Deleting another user's entry affects 0 rows => NOT_FOUND (no information leak). */
export async function removeFromWishlist(userId: string, id: string) {
  const rows = await getDb().delete(wishlists).where(and(eq(wishlists.id, id), eq(wishlists.userId, userId))).returning({ id: wishlists.id });
  if (!rows.length) throw new AppError("NOT_FOUND", "غير موجود");
}
