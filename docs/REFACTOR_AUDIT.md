# Refactor audit — single parent product, multi-variant (2026-11-10)

Source brief: `CLAUDE_REFACTOR_SINGLE_PRODUCT_STORE.md` (pasted). Paths relative to `apps/web/`.

## Verdict
The codebase is **already variant-centred**: one `products` row, `product_variants` = product×colour×size with unique SKU,
per-variant `inventory` (CHECK on_hand≥0, reserved≥0, reserved≤on_hand), per-variant `price_tiers` (GiST non-overlap),
row-locked reservations in ascending variant-id order, order-item snapshots, separate order/payment/shipping states.
**No duplicate-product data exists.** The refactor is an *extension* (add the design/pattern axis, variant-level
merchandising, product-scope tiers), not a rewrite. No destructive migration is needed.

## Data snapshot (local Docker DB `shop`, before any change)
products 1 (active 1, `demo-tshirt`) · variants 12 · colors 3 · sizes 4 · media 0 · price_tiers 24 · inventory 12
(0 variants without inventory) · categories/brands/collections 1/1/1 · wishlists 0 · users 1 · reservations 0 ·
**orders 70 / order_items 0 / payment_attempts 0 / order_events 0** (see F11).
Backup: `backups/pre-refactor-20261110.dump` (pg_dump -Fc, 33 table-data entries, git-ignored).
Production data: **not inspected** (no access) — the same counts must be captured there before migrating.

## Findings — Existing / Incorrect / Required change / Risk

| # | Existing (file) | Incorrect vs brief | Required change | Risk |
|---|---|---|---|---|
| F1 | `src/server/db/schema.ts` variants: `color_id`,`size_id`, unique (product,color,size) | No **design/pattern** axis; a new pattern would force a fake colour or a new product | Add `designs` table (slug,name,name_en,sort,active, optional swatch/thumbnail) + nullable `product_variants.design_id`; replace unique with two partial uniques (`design_id is null` / not null) | Low: additive; existing rows keep `design_id null` |
| F2 | `products` allows any number of active rows; `saveProduct` (`src/server/admin/catalog.ts:85`) inserts a new product when no id | Nothing stops duplicate parents | Admin editor edits **the** product only (no create when one active exists); partial unique index `products_one_active_uq on ((true)) where active` | Med: test fixtures create 1 product → OK; blocks future multi-product until index dropped (documented) |
| F3 | `product_media.color_id` only | Images can't target a design or exact variant | Add nullable `design_id`, `variant_id` (FK, `on delete set null`); PDP picks most specific match variant→design+colour→colour→product | Low |
| F4 | Taxonomy junctions are product-level (`product_categories/brands/collections`) | With one parent, collection/category filters are all-or-nothing → useless | Add `collection_variants(collection_id,variant_id)` (and design-level if merchant wants); keep product-level categories/brand; filters use variant links | Low; additive |
| F5 | `price_tiers.variant_id NOT NULL` | Admin must duplicate tiers on every variant (hundreds) | Add `product_id` scope: exactly one of variant_id/product_id (CHECK); variant tiers override product tiers per mode; extend GiST exclusion to product scope | Med: pricing engine + checkout must resolve identically; covered by unit + integration tests |
| F6 | `listCatalog` (`src/server/catalog/index.ts`) cards = product×colour; search on product/colour name only | No design filter, no SKU/design search, no variant-level featured/sort | Cards = design×colour group (or variant); `q` matches SKU, design, colour; filters `design[]`; `variants.featured/sort_order` | Med: query rewrite; keep same `CatalogCard` contract + add fields |
| F7 | `getRecommendations` loads 48 cards then filters | Fine for one product but ignores design | Recommend other designs/colours of same parent, ranked by sales, excluding current design+colour | Low |
| F8 | `order_items` snapshots sku/name/colour/size | No design snapshot | Add nullable `design_snapshot`; checkout writes it | Low |
| F9 | Cart (`src/components/cart/cart-store.ts:44`) consolidates on variantId **+ purchaseMode** | Same variant can appear as two lines (RETAIL + BULK); brief: same variant consolidates, tier by that line's qty | Verify `normalizeLines`/`computeQuote`; then consolidate per variant, mode derived from qty vs bulk MOQ (or keep explicit mode but merge) — decide in checkpoint 3 with test | Med: UX change; stock already summed per variant in `reserveAll` |
| F10 | `scripts/seed-demo.ts` seeds a demo **T-shirt** | Product family is textile/towel with patterns | Re-seed placeholder towel w/ 2–3 placeholder designs (clearly "demo"), never real merch | Low (dev only) |
| F11 | 70 `VIZ-*` orders, no items/payments/events, dates 2026-09-15→11-08 | Orphaned synthetic rows (dashboard demo); violate "order has ≥1 item" and inflate revenue KPIs | Delete **local only** after owner confirms; never in prod. Add test/report query for orders without items | Low locally; must not reach prod |
| F12 | Search index `products_name_search_idx` on product name | Search is variant-level now | Add trigram/btree indexes on `product_variants.sku`, `designs.name`; index `variants(design_id)` | Low |
| F13 | Admin variants page (`src/app/admin/variants/page.tsx`) one form per variant | No matrix editing; no design | Design×colour×size matrix (create missing combos, bulk price/stock) | Med: UI scope |
| F14 | Hosting: brief says Business only / no Docker; `CLAUDE.md` records owner approval of Docker+VPS (2026-11-09) with Business path still supported | Not a defect — owner decision is later and explicit | Keep both paths; no new services | None |

Verified OK (keep): inventory locking (`src/server/inventory/index.ts:16`, `FOR UPDATE` ordered by variant id), wishlist per
variant (unique user+variant), idempotent checkout/webhooks (T05), money in integer halalas, server-side pricing.

## Migration plan (expand → backfill → verify → cut over → clean up)
1. **0002_designs_variant_merch.sql (expand, additive only):** `designs`; `product_variants.design_id` (nullable FK
   restrict), `featured bool default false`, `sort_order int default 0`; partial uniques; `product_media.design_id/variant_id`;
   `collection_variants`; `order_items.design_snapshot`; `price_tiers.product_id` + scope CHECK + new exclusion; indexes;
   `products_one_active_uq`. No DROP / TRUNCATE. Old unique (product,color,size) is dropped only *after* the partial unique on
   `design_id is null` exists (same transaction).
2. **Backfill:** none required (existing variants = "no design"). Optional: merchant-approved default design.
3. **Verify:** before/after row counts (table above), `select count(*)` of variants violating uniqueness = 0, FK integrity,
   `pnpm test`.
4. **Cut over:** catalog/pricing/checkout/admin code reads new columns (checkpoints 3–5).
5. **Clean up:** nothing to drop. Legacy-id mapping table not needed (no products merged).
Rollback: reverse migration `0002_down.sql` (drop added objects, restore original unique) + `pg_restore` of the backup.
Production run requires explicit owner authorization and a fresh backup there.

## Open questions (non-blocking; defaults chosen)
- Is "pack" a real option? Default: **no** (not modelled until merchant confirms).
- Tier basis: per variant line (brief default) — current code already evaluates per variant; confirm in checkpoint 3.
- Delete the 70 local `VIZ-*` orders? Default: keep until owner says yes.
