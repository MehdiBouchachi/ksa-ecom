# Product behavior — customer routes
Default currency SAR; Arabic RTL responsive/mobile-first; English-ready routing/content. One product family, presented as multiple sellable combinations/merchandising cards; do not invent extra physical products.

| Route | Must have |
|---|---|
| `/` | brand/hero, authentic product photos/video, variants or featured cards, why-us, about, payment+shipping trust, FAQ summary, buy CTAs |
| `/products` | listing cards, product-name search, filter category/brand/collection/color/size/price/stock, sort recommended/newest/price/bestselling, pagination/load-more, wishlist |
| `/categories/[slug]`, `/brands/[slug]`, `/collections/[slug]` | group description + filtered listing; taxonomy maintained by admin |
| `/products/[slug]` | gallery/video, specs, swatches/color, size, selected SKU stock/price, retail/bulk switch, qty, tier price, cart/buy, related and rule-based recommended cards |
| `/wishlist` | saved entries by customer, remove/move to cart |
| `/cart` | selected SKU/color/size, qty editing, remove, retail/bulk tier preview, subtotal/shipping/VAT/total (preview only) |
| `/checkout` | validated full name/email/phone, shipping Saudi address fields, terms, final server quote, PSP redirect |
| `/checkout/result` | verified server-side state (never confirm by URL/query alone) |
| `/auth/login`, `/auth/register`, `/auth/forgot-password` | sign-in/up, reset, secure session |
| `/account/profile` | edit name/email/phone/avatar/password |
| `/account/orders`, `/account/orders/[id]` | own orders only, snapshots of SKU/color/size/price/address; distinct order, payment, shipping status |
| `/account/orders/[id]/tracking` | Aramex AWB/current status/timeline if available |
| `/about`, `/contact`, `/faq`, `/policies/[slug]` | merchant-supplied content, contact form, shipping/returns/privacy/terms |

**Retail:** qty>=1 at normal variant price. **Wholesale:** choose bulk mode, merchant-configurable MOQ and non-overlapping quantity price tiers; default evaluate each variant order line independently, no aggregation of mixed colors/sizes. Both modes share one checkout, payment gateway and inventory pool. No invented merchant tier amounts.

**Catalog realism:** one canonical physical product; recommendations/related point to meaningful color/size/style/collection options and must not masquerade as nonexistent independent SKUs.
