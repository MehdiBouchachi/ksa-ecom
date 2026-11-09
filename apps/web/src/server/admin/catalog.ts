import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { priceTierSchema, slug as slugSchema } from "@saudi-ecom/contracts";
import { getDb, pgConstraint, pgErrorCode, withTx, type Executor } from "../db";
import {
  auditLogs,
  brands,
  categories,
  collections,
  colors,
  contentPages,
  inventory,
  priceTiers,
  productBrands,
  productCategories,
  productCollections,
  productMedia,
  productVariants,
  products,
  sizes,
} from "../db/schema";
import { AppError } from "../lib/errors";

/* Staff (Admin + Manager) catalog operations. Callers must have passed requireStaff(). */

const audit = (exec: Executor, actorId: string, action: string, entity: string, entityId: string, data: Record<string, unknown> = {}) =>
  exec.insert(auditLogs).values({ actorId, action, entity, entityId, data });

function mapUnique(e: unknown, msg = "القيمة مستخدمة مسبقًا"): never {
  if (pgErrorCode(e) === "23505") throw new AppError("CONFLICT", msg, { constraint: pgConstraint(e) });
  if (pgErrorCode(e) === "23503") throw new AppError("CONFLICT", "لا يمكن الحذف لوجود بيانات مرتبطة");
  if (pgErrorCode(e) === "23514") throw new AppError("VALIDATION_FAILED", "قيمة غير صالحة", { constraint: pgConstraint(e) });
  if (pgErrorCode(e) === "23P01") throw new AppError("CONFLICT", "شرائح الأسعار متداخلة");
  throw e;
}

/* --------------------------------- Products --------------------------------- */
export const productInputSchema = z.object({
  id: z.uuid().optional(),
  slug: slugSchema,
  name: z.string().trim().min(2).max(200),
  nameEn: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(10_000).default(""),
  specs: z.array(z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(300) })).max(40).default([]),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(170).optional().nullable(),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
  categoryIds: z.array(z.uuid()).default([]),
  brandIds: z.array(z.uuid()).default([]),
  collectionIds: z.array(z.uuid()).default([]),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export async function listProductsAdmin() {
  return getDb()
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      active: products.active,
      featured: products.featured,
      // Qualified explicitly: drizzle renders ${products.id} unqualified inside a select subquery (→ v.id).
      variants: sql<number>`(select count(*)::int from product_variants v where v.product_id = "products"."id")`,
      updatedAt: products.updatedAt,
    })
    .from(products)
    .orderBy(asc(products.sortOrder), asc(products.name));
}

export async function getProductAdmin(id: string) {
  const db = getDb();
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (!p) return null;
  const [cats, brs, cols, media] = await Promise.all([
    db.select({ id: productCategories.categoryId }).from(productCategories).where(eq(productCategories.productId, id)),
    db.select({ id: productBrands.brandId }).from(productBrands).where(eq(productBrands.productId, id)),
    db.select({ id: productCollections.collectionId }).from(productCollections).where(eq(productCollections.productId, id)),
    db.select().from(productMedia).where(eq(productMedia.productId, id)).orderBy(asc(productMedia.sortOrder)),
  ]);
  return { ...p, categoryIds: cats.map((c) => c.id), brandIds: brs.map((b) => b.id), collectionIds: cols.map((c) => c.id), media };
}

export async function saveProduct(actorId: string, raw: unknown) {
  const input = productInputSchema.parse(raw);
  try {
    return await withTx(async (tx) => {
      const values = {
        slug: input.slug,
        name: input.name,
        nameEn: input.nameEn ?? null,
        description: input.description,
        specs: input.specs,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        featured: input.featured,
        sortOrder: input.sortOrder,
        active: input.active,
        updatedAt: new Date(),
      };
      let id = input.id;
      if (id) {
        const rows = await tx.update(products).set(values).where(eq(products.id, id)).returning({ id: products.id });
        if (!rows.length) throw new AppError("NOT_FOUND", "المنتج غير موجود");
      } else {
        id = (await tx.insert(products).values(values).returning({ id: products.id }))[0]!.id;
      }
      await tx.delete(productCategories).where(eq(productCategories.productId, id));
      await tx.delete(productBrands).where(eq(productBrands.productId, id));
      await tx.delete(productCollections).where(eq(productCollections.productId, id));
      if (input.categoryIds.length) await tx.insert(productCategories).values(input.categoryIds.map((categoryId) => ({ productId: id!, categoryId })));
      if (input.brandIds.length) await tx.insert(productBrands).values(input.brandIds.map((brandId) => ({ productId: id!, brandId })));
      if (input.collectionIds.length) await tx.insert(productCollections).values(input.collectionIds.map((collectionId) => ({ productId: id!, collectionId })));
      await audit(tx, actorId, input.id ? "product.update" : "product.create", "product", id, { slug: input.slug });
      return { id };
    });
  } catch (e) {
    mapUnique(e, "الرابط (slug) مستخدم");
  }
}

/* ------------------------------- Colors / Sizes ------------------------------ */
export const colorInputSchema = z.object({
  id: z.uuid().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1).max(60),
  nameEn: z.string().trim().max(60).optional().nullable(),
  swatchHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});
export const sizeInputSchema = z.object({
  id: z.uuid().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1).max(30),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const listColors = () => getDb().select().from(colors).orderBy(asc(colors.sortOrder));
export const listSizes = () => getDb().select().from(sizes).orderBy(asc(sizes.sortOrder));

export async function saveColor(actorId: string, raw: unknown) {
  const { id, ...v } = colorInputSchema.parse(raw);
  try {
    const row = id
      ? (await getDb().update(colors).set({ ...v, nameEn: v.nameEn ?? null }).where(eq(colors.id, id)).returning())[0]
      : (await getDb().insert(colors).values({ ...v, nameEn: v.nameEn ?? null }).returning())[0];
    if (!row) throw new AppError("NOT_FOUND", "غير موجود");
    await audit(getDb(), actorId, id ? "color.update" : "color.create", "color", row.id, v);
    return row;
  } catch (e) {
    mapUnique(e);
  }
}

export async function saveSize(actorId: string, raw: unknown) {
  const { id, ...v } = sizeInputSchema.parse(raw);
  try {
    const row = id ? (await getDb().update(sizes).set(v).where(eq(sizes.id, id)).returning())[0] : (await getDb().insert(sizes).values(v).returning())[0];
    if (!row) throw new AppError("NOT_FOUND", "غير موجود");
    await audit(getDb(), actorId, id ? "size.update" : "size.create", "size", row.id, v);
    return row;
  } catch (e) {
    mapUnique(e);
  }
}

/* --------------------------------- Variants ---------------------------------- */
export const variantInputSchema = z.object({
  id: z.uuid().optional(),
  productId: z.uuid(),
  colorId: z.uuid(),
  sizeId: z.uuid(),
  sku: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9._-]+$/),
  retailPriceHalalas: z.number().int().min(1).max(100_000_000),
  compareAtPriceHalalas: z.number().int().min(1).max(100_000_000).nullable().default(null),
  active: z.boolean().default(true),
});

export async function listVariantsAdmin(productId?: string) {
  return getDb()
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      productName: products.name,
      sku: productVariants.sku,
      colorId: productVariants.colorId,
      colorName: colors.name,
      swatchHex: colors.swatchHex,
      sizeId: productVariants.sizeId,
      sizeName: sizes.name,
      retailPriceHalalas: productVariants.retailPriceHalalas,
      compareAtPriceHalalas: productVariants.compareAtPriceHalalas,
      active: productVariants.active,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .innerJoin(colors, eq(colors.id, productVariants.colorId))
    .innerJoin(sizes, eq(sizes.id, productVariants.sizeId))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(productId ? eq(productVariants.productId, productId) : undefined)
    .orderBy(asc(products.name), asc(colors.sortOrder), asc(sizes.sortOrder));
}

/** Creating a variant also creates its inventory row (on_hand=0) in the same transaction. */
export async function saveVariant(actorId: string, raw: unknown) {
  const { id, ...v } = variantInputSchema.parse(raw);
  try {
    return await withTx(async (tx) => {
      if (id) {
        const [row] = await tx.update(productVariants).set({ ...v, updatedAt: new Date() }).where(eq(productVariants.id, id)).returning();
        if (!row) throw new AppError("NOT_FOUND", "غير موجود");
        await audit(tx, actorId, "variant.update", "variant", id, { sku: v.sku, price: v.retailPriceHalalas, active: v.active });
        return row;
      }
      const [row] = await tx.insert(productVariants).values(v).returning();
      await tx.insert(inventory).values({ variantId: row!.id, onHand: 0, reserved: 0 });
      await audit(tx, actorId, "variant.create", "variant", row!.id, { sku: v.sku, price: v.retailPriceHalalas });
      return row!;
    });
  } catch (e) {
    mapUnique(e, "SKU أو تركيبة اللون والمقاس موجودة مسبقًا");
  }
}

/* -------------------------------- Price tiers -------------------------------- */
export async function listTiers(variantId?: string) {
  return getDb()
    .select({
      id: priceTiers.id,
      variantId: priceTiers.variantId,
      sku: productVariants.sku,
      mode: priceTiers.mode,
      minQty: priceTiers.minQty,
      maxQty: priceTiers.maxQty,
      unitPriceHalalas: priceTiers.unitPriceHalalas,
      active: priceTiers.active,
    })
    .from(priceTiers)
    .innerJoin(productVariants, eq(productVariants.id, priceTiers.variantId))
    .where(variantId ? eq(priceTiers.variantId, variantId) : eq(priceTiers.active, true))
    .orderBy(asc(productVariants.sku), asc(priceTiers.mode), asc(priceTiers.minQty));
}

export function rangesOverlap(a: { minQty: number; maxQty: number | null }, b: { minQty: number; maxQty: number | null }) {
  const aMax = a.maxQty ?? Number.POSITIVE_INFINITY;
  const bMax = b.maxQty ?? Number.POSITIVE_INFINITY;
  return a.minQty <= bMax && b.minQty <= aMax;
}

/** Adds a tier; overlap rejected in-transaction (variant row locked) and by the DB exclusion constraint. */
export async function addTier(actorId: string, raw: unknown) {
  const t = priceTierSchema.parse(raw);
  try {
    return await withTx(async (tx) => {
      const [v] = await tx.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.id, t.variantId)).for("update");
      if (!v) throw new AppError("INVALID_VARIANT", "خيار غير موجود");
      const existing = await tx
        .select()
        .from(priceTiers)
        .where(and(eq(priceTiers.variantId, t.variantId), eq(priceTiers.mode, t.mode), eq(priceTiers.active, true)));
      if (existing.some((e) => rangesOverlap(e, t))) throw new AppError("CONFLICT", "الشريحة تتداخل مع شريحة قائمة");
      const [row] = await tx.insert(priceTiers).values(t).returning();
      await audit(tx, actorId, "tier.create", "price_tier", row!.id, t);
      return row!;
    });
  } catch (e) {
    mapUnique(e);
  }
}

export async function deactivateTier(actorId: string, id: string) {
  const rows = await getDb().update(priceTiers).set({ active: false }).where(eq(priceTiers.id, id)).returning({ id: priceTiers.id });
  if (!rows.length) throw new AppError("NOT_FOUND", "غير موجود");
  await audit(getDb(), actorId, "tier.deactivate", "price_tier", id);
}

/* --------------------------------- Taxonomy ---------------------------------- */
export const TAXONOMY_TABLES = { categories, brands, collections } as const;
export type TaxonomyTable = keyof typeof TAXONOMY_TABLES;

export const taxonomyInputSchema = z.object({
  id: z.uuid().optional(),
  slug: slugSchema,
  name: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().max(120).optional().nullable(),
  description: z.string().trim().max(5000).default(""),
  seoTitle: z.string().trim().max(70).optional().nullable(),
  seoDescription: z.string().trim().max(170).optional().nullable(),
  sortOrder: z.number().int().default(0),
  active: z.boolean().default(true),
});

export async function listTaxonomyAdmin(kind: TaxonomyTable) {
  const t = TAXONOMY_TABLES[kind];
  return getDb().select().from(t).orderBy(asc(t.sortOrder), asc(t.name));
}

export async function saveTaxonomy(actorId: string, kind: TaxonomyTable, raw: unknown) {
  const t = TAXONOMY_TABLES[kind];
  const { id, ...v } = taxonomyInputSchema.parse(raw);
  const values = { ...v, nameEn: v.nameEn ?? null, seoTitle: v.seoTitle ?? null, seoDescription: v.seoDescription ?? null };
  try {
    const row = id ? (await getDb().update(t).set(values).where(eq(t.id, id)).returning())[0] : (await getDb().insert(t).values(values).returning())[0];
    if (!row) throw new AppError("NOT_FOUND", "غير موجود");
    await audit(getDb(), actorId, `${kind}.${id ? "update" : "create"}`, kind, row.id, { slug: v.slug });
    return row;
  } catch (e) {
    mapUnique(e, "الرابط (slug) مستخدم");
  }
}

export async function deleteTaxonomy(actorId: string, kind: TaxonomyTable, id: string) {
  const t = TAXONOMY_TABLES[kind];
  const rows = await getDb().delete(t).where(eq(t.id, id)).returning({ id: t.id });
  if (!rows.length) throw new AppError("NOT_FOUND", "غير موجود");
  await audit(getDb(), actorId, `${kind}.delete`, kind, id);
}

/* ----------------------------------- Media ----------------------------------- */
export const mediaInputSchema = z.object({
  productId: z.uuid(),
  colorId: z.uuid().nullable().default(null),
  kind: z.enum(["IMAGE", "VIDEO"]).default("IMAGE"),
  url: z
    .string()
    .trim()
    .max(1000)
    .refine((u) => u.startsWith("https://") || u.startsWith("/"), "يجب أن يكون الرابط https أو مسارًا محليًا ثابتًا"),
  alt: z.string().trim().min(2).max(200),
  width: z.number().int().positive().nullable().default(null),
  height: z.number().int().positive().nullable().default(null),
  sortOrder: z.number().int().default(0),
});

export async function addMedia(actorId: string, raw: unknown) {
  const m = mediaInputSchema.parse(raw);
  const [row] = await getDb().insert(productMedia).values(m).returning();
  await audit(getDb(), actorId, "media.create", "product", m.productId, { url: m.url });
  return row!;
}

export async function deleteMedia(actorId: string, id: string) {
  const rows = await getDb().delete(productMedia).where(eq(productMedia.id, id)).returning({ id: productMedia.id, productId: productMedia.productId });
  if (!rows.length) throw new AppError("NOT_FOUND", "غير موجود");
  await audit(getDb(), actorId, "media.delete", "product", rows[0]!.productId, { mediaId: id });
}

/* ---------------------------------- Content ---------------------------------- */
export const CONTENT_SLUGS = ["about", "faq", "shipping", "returns", "privacy", "terms"] as const;
export const contentInputSchema = z.object({
  slug: z.enum(CONTENT_SLUGS),
  title: z.string().trim().min(2).max(150),
  body: z.string().trim().min(1).max(50_000),
  approved: z.boolean().default(false),
});

export const listContent = () => getDb().select().from(contentPages).orderBy(asc(contentPages.slug));

export async function getContent(slug: string) {
  const [row] = await getDb().select().from(contentPages).where(eq(contentPages.slug, slug));
  return row ?? null;
}

export async function saveContent(actor: { id: string; role: string }, raw: unknown) {
  const c = contentInputSchema.parse(raw);
  // Only an Admin may mark merchant/legal content as approved.
  const approved = actor.role === "ADMIN" ? c.approved : false;
  await getDb()
    .insert(contentPages)
    .values({ ...c, approved, updatedBy: actor.id })
    .onConflictDoUpdate({ target: contentPages.slug, set: { title: c.title, body: c.body, approved, updatedBy: actor.id, updatedAt: new Date() } });
  await audit(getDb(), actor.id, "content.save", "content", c.slug, { approved });
}

/** Utility used by inventory UI. */
export async function variantsExist(ids: string[]) {
  if (!ids.length) return true;
  const rows = await getDb().select({ id: productVariants.id }).from(productVariants).where(inArray(productVariants.id, ids));
  return rows.length === new Set(ids).size;
}

export async function otherVariantWithSku(sku: string, exceptId?: string) {
  const rows = await getDb()
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(exceptId ? and(eq(productVariants.sku, sku), ne(productVariants.id, exceptId)) : eq(productVariants.sku, sku));
  return rows.length > 0;
}

export async function listAdjustments(variantId?: string, limit = 100) {
  const { inventoryAdjustments, users } = await import("../db/schema");
  return getDb()
    .select({
      id: inventoryAdjustments.id,
      sku: productVariants.sku,
      delta: inventoryAdjustments.delta,
      kind: inventoryAdjustments.kind,
      reason: inventoryAdjustments.reason,
      onHandAfter: inventoryAdjustments.onHandAfter,
      actor: users.fullName,
      createdAt: inventoryAdjustments.createdAt,
    })
    .from(inventoryAdjustments)
    .innerJoin(productVariants, eq(productVariants.id, inventoryAdjustments.variantId))
    .leftJoin(users, eq(users.id, inventoryAdjustments.actorId))
    .where(variantId ? eq(inventoryAdjustments.variantId, variantId) : undefined)
    .orderBy(sql`${inventoryAdjustments.createdAt} desc`)
    .limit(limit);
}
