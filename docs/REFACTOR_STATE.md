# Single-product / multi-variant refactor — state
Audit: `docs/REFACTOR_AUDIT.md` (F1–F14). One checkpoint per session; update this file after each.

## Checkpoints
- [x] **1. Audit + migration plan** (2026-11-10) — audit written; local backup `backups/pre-refactor-20261110.dump`; row counts recorded. No code changed.
- [ ] **2. Schema/migration** — `0002` additive migration (F1 designs, F2 one-active product, F3 media scope, F4 collection_variants, F5 product-scope tiers, F8 design snapshot, F12 indexes) + down script; before/after counts; `pnpm test`.
- [ ] **3. Query layer/pricing/inventory** — tier resolution variant→product scope (unit + integration), F9 cart consolidation decision + test, design in `loadVariantPricing`/checkout snapshot.
- [ ] **4. Storefront** — F6 listing (design facet, SKU search, variant featured/sort), PDP design×colour×size selector (only real combos), media fallback chain, F7 recommendations, wishlist/cart labels.
- [ ] **5. Admin/Manager** — F2 single-product editor, designs CRUD, F13 variant matrix, collection↔variant links, product-scope tiers UI; Manager 403 tests on staff endpoints (exists — re-run).
- [ ] **6. Payments/Aramex/email** — re-verify lifecycles with design snapshots (PSP/Aramex still sandbox, blocked on merchant).
- [ ] **7. SEO/perf/tests/deploy** — JSON-LD offers per variant, sitemap, §8 test list, F10 towel demo seed, F11 cleanup query.

## Tests
Baseline (from `docs/STATE.md`): 54/54, build/lint/typecheck clean — not re-run in checkpoint 1 (no code change).

## Blockers
- Production DB not inspected; capture counts + backup there before migrating (owner authorization required).
- Merchant: real designs/colours/sizes/prices/tiers/photos; is "pack" an option?
- Owner: OK to delete 70 local synthetic `VIZ-*` orders (no items)?
