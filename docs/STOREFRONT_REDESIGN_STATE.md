# Storefront redesign — state
Brief: `CLAUDE_STOREFRONT_LANDING_UIUX_REDESIGN.md` (pasted 2026-11-10). Customer-facing UI only; commerce logic untouched.

## P0 audit (2026-11-10)
- Routes: `app/(store)/` home, products (+[slug]), categories/brands/collections [slug] (share `components/store/catalog-page.tsx`), cart, checkout (+result, mock-pay), wishlist, about/faq/contact, policies/[slug]. Layout `app/(store)/layout.tsx` = `Header` + `<main max-w-6xl>` + `Footer`.
- Data: catalog cards = product × colour (`server/catalog`), PDP `getProductDetail` (variants/tiers/media/colours/sizes), media `product_media` (product + optional colour). **No design/pattern field yet** (schema checkpoint 2) → UI groups by colour now, ready for design later.
- Content: store identity from `store` settings; editable pages `about/faq/shipping/returns/privacy/terms` (`content_pages`, `approved` flag). No merchant-editable hero.
- Assets: **zero merchant images** in DB; only `public/placeholder.svg` (grey T-shirt — the offending visual). No logo/brand mark file.
- Tokens: storefront `@theme` in `app/globals.css` (stone + teal); font = system stack ("Segoe UI"/Noto); no `next/font`.
- Visual problems confirmed in the running app (1440/390): boxed hero with T-shirt placeholder; 3 identical cards ("تيشيرت قطني (منتج تجريبي)"); bordered "why us" boxes; demo About text; form-like filter sidebar; muted disabled buy CTA until a size is picked; sparse cart/wishlist empty states.
- Claims currently hard-coded on home: "شحن عبر أرامكس" (Aramex is sandbox here) and "شحن داخل المملكة" — must become conditional on real config.
- E2E (`tests/e2e/smoke.ts`) relies on: 3 `ul li article` cards on /products, "أضف إلى السلة", "تجزئة"/"جملة", "الحد الأدنى لطلب الجملة 12 قطعة", "SKU: DEMO-WHITE-M", size buttons by text, checkout copy → keep these strings.

## Decisions
- No photos → intentional **woven-textile panel** rendered in CSS from the variant's real swatch colour (no fake photography, no "coming soon").
- Home hero copy: new content page slug `home` (title = headline, body = supporting text), editable in Admin → Settings → Storefront content. Shown only when approved; otherwise neutral factual copy.
- About/FAQ previews on the home page render only when the merchant has approved that content (demo text stays off the home page).
- Aramex/shipping claims only when the shipping integration is live; payment badges only for methods enabled in settings.

## Phases
- [x] P0 audit
- [x] P1 foundations — `app/globals.css` (warm tokens, `.container-store`, `.textile` woven fallback in `@layer components`, store dialogs), font **IBM Plex Sans Arabic via `@fontsource/ibm-plex-sans-arabic@5.3.0`** (self-hosted; `next/font/google` was dropped because the Docker build could not reach fonts.gstatic.com), `components/store/ui.tsx` (buttons, field, `TextilePanel`, `SectionHeading`, `StoreEmpty`), `header.tsx` + `header-client.tsx` (search dialog, drawer menu < 1024px, active nav), `footer.tsx` (settings-driven contact/legal/payment methods only)
- [x] P2 homepage — moved to `app/(home)/page.tsx` + `(home)/layout.tsx` (full-bleed; URL still `/`). Sections: hero (photo if uploaded, else real colours as cloth) → colours → retail/wholesale (real retail-from, wholesale minimum and lowest tier from DB; hidden when no tiers) → collections (only if ≥ 2) → story (only if About approved) → trust (Aramex only when shipping is live; returns only if approved) → FAQ (only if approved) → final CTA. Hero copy from new content slug `home` (Admin → Settings → Storefront content) once approved; `POLICY_SLUGS` keeps the launch checklist on legal pages only.
- [x] P3 — catalog (`catalog-page.tsx`, `filters.tsx`: rail/collapsible panel, colour/size chips, active-filter chips, groupings shown only when ≥ 2 options), product page (`variant-picker.tsx` → `ProductView`: gallery follows colour, textile fallback, `?mode=bulk` preselects wholesale at the real minimum, "اختر المقاس" guides + focuses sizes instead of a dead button, qty stepper, tier table highlights the applied tier), cart (`cart-view.tsx`: stacked lines, stepper, sticky summary; same quote API/maths)
- [x] P4 — wishlist cards + empty state, FAQ page accordion (`content-body.tsx`), content/contact typography, product card (colour is the title; badges only from data)
- [x] P5 QA (2026-11-10) — lint, typecheck clean; vitest 58/58; `next build` OK; **e2e smoke (production build) all green** after making it Windows-portable and waiting for streamed admin headings (`tests/e2e/smoke.ts`); storefront flows (scratch Playwright): home links, search dialog, mobile menu, filters + chips, size guidance + focus, add to cart, wholesale minimum, cart quote update/remove, signed-in wishlist add/remove — all PASS at 1440 and 390; sweep 9 pages × 360/390/768/1024/1440 = 45 renders, 0 overflow, 0 page errors; header verified single-line at 768/1024/1440. Docker image rebuilt and running.

## Merchant content / assets still needed
- Product photos (per colour, plus a styled/folded shot and a fabric close-up) uploaded to durable storage + `MEDIA_PUBLIC_HOST` (until then the woven-colour panels are shown).
- Real product name/description/specs (current product is the demo T-shirt from the seed), real colours/sizes/prices/tiers.
- Approved `home` headline + text, About, FAQ, Returns content (sections stay hidden until approved).
- Store identity: final name, legal name, CR/VAT numbers, email/WhatsApp/address; payment methods actually enabled; logo/wordmark file.
- Design/pattern dimension (schema checkpoint 2) — cards will then title by design × colour.

## Known gaps
- Filter options show no per-option counts (`getFacets` has none).
- Error messages from the server are Arabic-only; English storefront strings are scaffolded only (`i18n/en.ts`).
- Social video embed not built (no approved video).
- Windows dev note: `next dev` hot reload can serve stale server components/actions — restart and delete `apps/web/.next/dev`.
