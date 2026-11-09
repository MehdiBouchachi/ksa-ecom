import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { CatalogQuery, PurchaseMode } from "@saudi-ecom/contracts";
import { getDb } from "../db";
import {
  brands,
  categories,
  collections,
  colors,
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

/*
 * Catalog realism: there is one canonical physical product family. Listing "cards" are
 * product × color combinations (real sellable options), never invented independent SKUs.
 * Availability shown here is informational; checkout re-validates under row locks.
 */

export type CatalogCard = {
  productId: string;
  productSlug: string;
  productName: string;
  colorId: string;
  colorSlug: string;
  colorName: string;
  swatchHex: string;
  minPriceHalalas: number;
  maxCompareAtHalalas: number | null;
  available: number;
  sizeCount: number;
  imageUrl: string | null;
  imageAlt: string | null;
  featured: boolean;
  hasBulk: boolean;
};

export type TaxonomyKind = "category" | "brand" | "collection";

const SORT_SQL: Record<CatalogQuery["sort"], SQL> = {
  recommended: sql`p.featured desc, p.sort_order asc, c.sort_order asc`,
  newest: sql`p.created_at desc, c.sort_order asc`,
  price_asc: sql`cards.min_price asc, c.sort_order asc`,
  price_desc: sql`cards.min_price desc, c.sort_order asc`,
  bestselling: sql`sold.qty desc, p.sort_order asc, c.sort_order asc`,
};

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

export async function listCatalog(q: CatalogQuery): Promise<{ items: CatalogCard[]; total: number; page: number; pageSize: number }> {
  const where: SQL[] = [sql`pv.active`, sql`p.active`, sql`c.active`, sql`s.active`];
  if (q.q) {
    const like = `%${escapeLike(q.q)}%`;
    where.push(sql`(p.name ilike ${like} or coalesce(p.name_en,'') ilike ${like} or c.name ilike ${like})`);
  }
  if (q.category) where.push(sql`exists (select 1 from product_categories pc join categories t on t.id = pc.category_id and t.active where pc.product_id = p.id and t.slug = ${q.category})`);
  if (q.brand) where.push(sql`exists (select 1 from product_brands pb join brands t on t.id = pb.brand_id and t.active where pb.product_id = p.id and t.slug = ${q.brand})`);
  if (q.collection) where.push(sql`exists (select 1 from product_collections pcl join collections t on t.id = pcl.collection_id and t.active where pcl.product_id = p.id and t.slug = ${q.collection})`);
  if (q.color.length) where.push(sql`c.slug in (${sql.join(q.color.map((x) => sql`${x}`), sql`, `)})`);
  if (q.size.length) where.push(sql`s.slug in (${sql.join(q.size.map((x) => sql`${x}`), sql`, `)})`);

  const having: SQL[] = [sql`true`];
  if (q.minPrice !== undefined) having.push(sql`min(v.price) >= ${q.minPrice}`);
  if (q.maxPrice !== undefined) having.push(sql`min(v.price) <= ${q.maxPrice}`);
  if (q.inStock) having.push(sql`sum(v.available) > 0`);

  const offset = (q.page - 1) * q.pageSize;
  const res = await getDb().execute<{
    product_id: string; slug: string; name: string; color_id: string; color_slug: string; color_name: string; swatch_hex: string;
    min_price: number; max_compare: number | null; available: number; size_count: number; image_url: string | null; image_alt: string | null;
    featured: boolean; has_bulk: boolean; total: number;
  }>(sql`
    with v as (
      select pv.id, pv.product_id, pv.color_id, pv.size_id, pv.retail_price_halalas as price, pv.compare_at_price_halalas as compare_at,
             greatest(coalesce(i.on_hand,0) - coalesce(i.reserved,0), 0) as available
      from product_variants pv
      join products p on p.id = pv.product_id
      join colors c on c.id = pv.color_id
      join sizes s on s.id = pv.size_id
      left join inventory i on i.variant_id = pv.id
      where ${sql.join(where, sql` and `)}
    ),
    cards as (
      select v.product_id, v.color_id, min(v.price)::int as min_price, max(v.compare_at)::int as max_compare,
             sum(v.available)::int as available, count(distinct v.size_id)::int as size_count,
             bool_or(exists (select 1 from price_tiers pt where pt.variant_id = v.id and pt.mode = 'BULK' and pt.active)) as has_bulk
      from v group by v.product_id, v.color_id
      having ${sql.join(having, sql` and `)}
    )
    select cards.product_id, p.slug, p.name, cards.color_id, c.slug as color_slug, c.name as color_name, c.swatch_hex,
           cards.min_price, cards.max_compare, cards.available, cards.size_count, cards.has_bulk, p.featured,
           img.url as image_url, img.alt as image_alt, count(*) over()::int as total
    from cards
    join products p on p.id = cards.product_id
    join colors c on c.id = cards.color_id
    left join lateral (
      select m.url, m.alt from product_media m
      where m.product_id = p.id and m.kind = 'IMAGE' and (m.color_id = c.id or m.color_id is null)
      order by (m.color_id is null), m.sort_order limit 1
    ) img on true
    left join lateral (
      select coalesce(sum(oi.quantity),0)::int as qty from order_items oi
      join orders o on o.id = oi.order_id and o.payment_status = 'PAID'
      join product_variants pv2 on pv2.id = oi.variant_id
      where pv2.product_id = cards.product_id and pv2.color_id = cards.color_id
    ) sold on true
    order by ${SORT_SQL[q.sort]}
    limit ${q.pageSize} offset ${offset}
  `);
  const rows = res.rows;
  return {
    total: rows[0]?.total ?? 0,
    page: q.page,
    pageSize: q.pageSize,
    items: rows.map((r) => ({
      productId: r.product_id,
      productSlug: r.slug,
      productName: r.name,
      colorId: r.color_id,
      colorSlug: r.color_slug,
      colorName: r.color_name,
      swatchHex: r.swatch_hex,
      minPriceHalalas: r.min_price,
      maxCompareAtHalalas: r.max_compare,
      available: r.available,
      sizeCount: r.size_count,
      imageUrl: r.image_url,
      imageAlt: r.image_alt,
      featured: r.featured,
      hasBulk: r.has_bulk,
    })),
  };
}

export async function getFacets() {
  const db = getDb();
  const [cats, brs, cols, clr, szs, price] = await Promise.all([
    db.select({ slug: categories.slug, name: categories.name }).from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sortOrder)),
    db.select({ slug: brands.slug, name: brands.name }).from(brands).where(eq(brands.active, true)).orderBy(asc(brands.sortOrder)),
    db.select({ slug: collections.slug, name: collections.name }).from(collections).where(eq(collections.active, true)).orderBy(asc(collections.sortOrder)),
    db.select({ slug: colors.slug, name: colors.name, swatchHex: colors.swatchHex }).from(colors).where(eq(colors.active, true)).orderBy(asc(colors.sortOrder)),
    db.select({ slug: sizes.slug, name: sizes.name }).from(sizes).where(eq(sizes.active, true)).orderBy(asc(sizes.sortOrder)),
    db
      .select({ min: sql<number>`coalesce(min(${productVariants.retailPriceHalalas}),0)::int`, max: sql<number>`coalesce(max(${productVariants.retailPriceHalalas}),0)::int` })
      .from(productVariants)
      .where(eq(productVariants.active, true)),
  ]);
  return { categories: cats, brands: brs, collections: cols, colors: clr, sizes: szs, price: price[0] ?? { min: 0, max: 0 } };
}

const TAX = {
  category: categories,
  brand: brands,
  collection: collections,
} as const;

export async function getTaxonomy(kind: TaxonomyKind, slug: string) {
  const t = TAX[kind];
  const [row] = await getDb().select().from(t).where(and(eq(t.slug, slug), eq(t.active, true))).limit(1);
  return row ?? null;
}

export async function listTaxonomySlugs() {
  const db = getDb();
  const [c, b, l] = await Promise.all([
    db.select({ slug: categories.slug }).from(categories).where(eq(categories.active, true)),
    db.select({ slug: brands.slug }).from(brands).where(eq(brands.active, true)),
    db.select({ slug: collections.slug }).from(collections).where(eq(collections.active, true)),
  ]);
  return { categories: c.map((x) => x.slug), brands: b.map((x) => x.slug), collections: l.map((x) => x.slug) };
}

export type ProductDetailVariant = {
  id: string;
  sku: string;
  colorId: string;
  sizeId: string;
  retailPriceHalalas: number;
  compareAtPriceHalalas: number | null;
  available: number;
  tiers: { id: string; mode: PurchaseMode; minQty: number; maxQty: number | null; unitPriceHalalas: number }[];
};

export async function getProductDetail(slug: string) {
  const db = getDb();
  const [p] = await db.select().from(products).where(and(eq(products.slug, slug), eq(products.active, true))).limit(1);
  if (!p) return null;

  const variantRows = await db
    .select({
      id: productVariants.id,
      sku: productVariants.sku,
      colorId: productVariants.colorId,
      sizeId: productVariants.sizeId,
      price: productVariants.retailPriceHalalas,
      compareAt: productVariants.compareAtPriceHalalas,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
    })
    .from(productVariants)
    .innerJoin(colors, and(eq(colors.id, productVariants.colorId), eq(colors.active, true)))
    .innerJoin(sizes, and(eq(sizes.id, productVariants.sizeId), eq(sizes.active, true)))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(and(eq(productVariants.productId, p.id), eq(productVariants.active, true)));

  const ids = variantRows.map((v) => v.id);
  const [tiers, media, colorRows, sizeRows, cats, brs, cols] = await Promise.all([
    ids.length ? db.select().from(priceTiers).where(and(inArray(priceTiers.variantId, ids), eq(priceTiers.active, true))).orderBy(asc(priceTiers.minQty)) : [],
    db.select().from(productMedia).where(eq(productMedia.productId, p.id)).orderBy(asc(productMedia.sortOrder)),
    db.select().from(colors).where(eq(colors.active, true)).orderBy(asc(colors.sortOrder)),
    db.select().from(sizes).where(eq(sizes.active, true)).orderBy(asc(sizes.sortOrder)),
    db.select({ slug: categories.slug, name: categories.name }).from(productCategories).innerJoin(categories, eq(categories.id, productCategories.categoryId)).where(eq(productCategories.productId, p.id)),
    db.select({ slug: brands.slug, name: brands.name }).from(productBrands).innerJoin(brands, eq(brands.id, productBrands.brandId)).where(eq(productBrands.productId, p.id)),
    db.select({ slug: collections.slug, name: collections.name }).from(productCollections).innerJoin(collections, eq(collections.id, productCollections.collectionId)).where(eq(productCollections.productId, p.id)),
  ]);

  const variants: ProductDetailVariant[] = variantRows.map((v) => ({
    id: v.id,
    sku: v.sku,
    colorId: v.colorId,
    sizeId: v.sizeId,
    retailPriceHalalas: v.price,
    compareAtPriceHalalas: v.compareAt,
    available: Math.max(0, (v.onHand ?? 0) - (v.reserved ?? 0)),
    tiers: tiers
      .filter((t) => t.variantId === v.id)
      .map((t) => ({ id: t.id, mode: t.mode as PurchaseMode, minQty: t.minQty, maxQty: t.maxQty, unitPriceHalalas: t.unitPriceHalalas })),
  }));
  const usedColors = new Set(variants.map((v) => v.colorId));
  const usedSizes = new Set(variants.map((v) => v.sizeId));
  return {
    product: p,
    variants,
    colors: colorRows.filter((c) => usedColors.has(c.id)).map((c) => ({ id: c.id, slug: c.slug, name: c.name, swatchHex: c.swatchHex })),
    sizes: sizeRows.filter((s) => usedSizes.has(s.id)).map((s) => ({ id: s.id, slug: s.slug, name: s.name })),
    media: media.map((m) => ({ id: m.id, kind: m.kind, url: m.url, alt: m.alt, colorId: m.colorId, width: m.width, height: m.height })),
    categories: cats,
    brands: brs,
    collections: cols,
  };
}

/**
 * Rule-based recommendations: other real color options of the same product first, then options
 * from products sharing a collection/category, ordered by sales then merchandising order.
 */
export async function getRecommendations(productId: string, excludeColorId: string | null, limit = 4): Promise<CatalogCard[]> {
  const all = await listCatalog({ sort: "bestselling", page: 1, pageSize: 48, color: [], size: [], inStock: false });
  const sameProduct = all.items.filter((c) => c.productId === productId && c.colorId !== excludeColorId);
  const others = all.items.filter((c) => c.productId !== productId);
  return [...sameProduct, ...others].slice(0, limit);
}

export async function listActiveProductSlugs() {
  return getDb().select({ slug: products.slug, updatedAt: products.updatedAt }).from(products).where(eq(products.active, true));
}
