# Admin UI/UX refactor — state
Brief: `CLAUDE_ADMIN_UI_UX_REDESIGN_PROMPT.md` (pasted, 2026-11-10). One screen per checkpoint; update after each.
No schema change was needed so far. Business rules (stock locks, pricing engine, RBAC, payments, Aramex) untouched.

## Findings (screen → problem → new pattern)
| Screen | Problem (seen in the running app, 1440px AR) | New pattern |
|---|---|---|
| Shell | 13 flat links in 5 groups; breadcrumb repeats the page title; fixed 240px sidebar; hex colours inline | Task groups (Overview · Sales · Catalog[product, variants, stock, pricing] · Merchandising (collapsible) · People[Admin] · Store); icon-rail collapse (remembered); breadcrumb removed; tokens only |
| Variants | Big 8-field "add" form above the table; tiny inline price/compare inputs per row; colours/sizes forms below | Table first + URL filters (q/color/size/status/stock) + pagination; add/edit in a grouped side sheet; colours & sizes in their own sheet; colour×size coverage map (gaps → "+" deep link `?new=1&color&size`) |
| Stock | KPI cards + adjust form with a select of every SKU above the table | Stat strip, problem-first table, per-row "Adjust" sheet (add/remove/set count, live now→after preview, reserved guard, reason presets), ledger below |
| Pricing | Tier list + variant select + add form; no explanation, no preview, one variant at a time | Overview comparison (retail, wholesale minimum, tiers, gap warnings) → per-variant workspace (wholesale & retail tiers, add sheet, confirm-to-deactivate, engine-backed preview), all-or-nothing "add tier to several variants" |
| Orders / Shipping / Product / Merch / Customers / Team / Settings / Overview | Same long-form-above-table pattern; settings mixes legal warnings with editable data; shipping config first | Pending — see order below |

## Shared system (done)
- Tokens: `apps/web/src/app/globals.css` `.admin-theme` (surface, surface-muted, border-strong, primary(-hover/-soft), success/warning/destructive(+soft), focus, overlay); `@theme` registers them for Tailwind.
- Server primitives `apps/web/src/components/admin/ui.tsx`: `AdminPageHeader` (PageTitle kept as wrapper), `StatusBadge`, `Callout`, `EmptyState`, `FormSection`, `FilterBar`, `StatStrip`, `Pagination`, `Money`, `Swatch`, `withParams`, `btnGhostCls`, `iconBtnCls`; buttons/fields on tokens; `Field required`.
- Client `apps/web/src/components/admin/overlay.tsx`: `Overlay` (native `<dialog>` sheet/modal: focus trap, Escape, backdrop, focus return, closes after the server-action redirect), `OverlayFooter`, `SubmitButton` (pending + no double submit). `stock-adjust.tsx`.
- `apps/web/src/app/admin/actions.ts`: success messages localized (EN); variant/stock/tier actions honour `back` so filters survive saves; new `addTiersBatchAction`.
- `apps/web/src/server/admin/catalog.ts`: `addTiersBatch` (row-locked, all-or-nothing, conflicts by SKU); `listVariantsAdmin` returns `colorNameEn`.

## Screens
- [x] Shell/nav — `components/admin/shell.tsx`, `app/admin/layout.tsx`, `i18n/admin.ts`
- [x] Variants — `app/admin/variants/page.tsx`
- [x] Stock — `app/admin/inventory/page.tsx`
- [x] Pricing — `app/admin/pricing/page.tsx`
- [x] Orders — list (outline filter button; list already had tabs/URL filters/pagination from T10a); detail `app/admin/orders/[id]/page.tsx`: cancel = confirm dialog (labelled reason, restock), status update secondary, pending-aware buttons
- [x] Shipping — `app/admin/shipping/page.tsx`: tabs To ship (default) / Shipments / Settings; failed attempts shown as Retry + error; `listShippableOrders` returns customer, paidAt, attempt state
- [x] Main product — `app/admin/products/page.tsx`: overview (status, variants, price range, stock → links), media grid + add sheet + confirm delete, one Edit sheet (SEO collapsed); no "new product" CTA once one exists; extra legacy products listed with a warning
- [x] Merchandising — `components/admin/taxonomy-admin.tsx`: list first, add/edit sheet, confirm delete, "linked to product" (`taxonomyUsage`), search when > 8
- [x] Customers — empty state; quiet search button
- [x] Team — add sheet (role cards explain Admin vs Manager, invite default, temp password behind disclosure), edit sheet per member, no self-edit
- [x] Settings — `app/admin/settings/page.tsx`: tabs Business identity / Storefront content / Payments & VAT / Legal & launch (readiness checks + approval) / Integration status (`server/lib/integration-status.ts`, states only). Manager: content only. `saveStoreProfileAction` now writes only submitted fields (tabs never blank each other)
- [x] Overview — "Needs attention" row first (to ship, shipping problems, needs review, out/low stock; uncapped counts in `getDashboard().attention`), quick actions removed ("Add product" was wrong for one product)

## Tests / verification (2026-11-10)
- `pnpm -r lint`, `pnpm -r typecheck` clean; vitest 58/58 (incl. new `tests/integration/pricing-admin.test.ts` 4/4); production build OK (Docker image rebuilt, `/api/health` 200).
- Browser flows (Playwright vs `next dev` + embedded PG; real orders placed through storefront checkout + sandbox PSP), all PASS on a clean dev server: Variants AR/EN 1440/390, Stock, Pricing, Shipping (one AWB on double-click, refresh, settings tab), Main product (edit, media add/delete), Merchandising (add, duplicate slug rejected, edit, delete) AR 390, Team (invite, disable, no self-edit), Order detail (status + note, cancel dialog, Escape keeps order), Settings (tabs don't blank each other; integration page shows no secrets), Manager (no People nav; /admin/team & /admin/customers refused; settings = content only).
- Responsive sweep: 19 admin views × 375/768/1024/1440 × AR/EN = 152 renders, all 200, zero horizontal overflow. A reported hydration mismatch (`caret-color`) was a Playwright screenshot artefact (gone with `caret: "initial"`).
- Local notes (Windows): run integration tests with `TEST_DATABASE_URL` (embedded-PG setup calls `groupadd`); `next dev` hot reload can serve stale server actions — restart and delete `apps/web/.next/dev` when behaviour looks old.

## Known issues / next
- Domain error messages (AppError) are Arabic-only; success messages are localized.
- Design/pattern axis waits for refactor checkpoint 2 (`docs/REFACTOR_STATE.md`); Variants/Stock/Pricing will gain a "Design" column then.
- Order list has no per-tab counts; customer detail page untouched (already functional).
- No before/after screenshot set committed (kept in the session scratchpad only).
- Next: refactor checkpoint 2 (schema: designs axis, product-scope tiers), then surface it in Variants/Pricing.
