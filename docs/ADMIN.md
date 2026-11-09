# Back office (shared protected `/admin` app)
Both Admin and Manager: Dashboard (revenue, orders, by-status counts, recent orders, basic stock warnings); Orders list/search/status filters/details/cancel policy, variant snapshots, shipping info, verified payment reference; Products edit names/specs/prices/discount/media/SEO/feature flags; variants/colors/sizes/SKU and per-variant availability; inventory adjustments with reason; retail & bulk tier/MOQ editor; categories/brands/collections; Aramex shipment creation/tracking; basic contact and policy content, operational settings.

Pages: `/admin`, `/admin/orders`, `/admin/orders/[id]`, `/admin/products`, `/admin/variants`, `/admin/pricing`, `/admin/inventory`, `/admin/categories`, `/admin/brands`, `/admin/collections`, `/admin/shipping`, `/admin/settings`.

**Admin only:** `/admin/customers` customer directory/lookup, `/admin/team` list/add/disable Admin/Manager and role changes; privileged integration/security settings. **Manager forbidden** from customer directory and account-management functions even if navigation or URL guessed. Manager sees customer name/phone/address only embedded in order fulfillment, not user profiles. All privileges enforced in server actions/APIs and database-query authorization, return 403 where unauthorized.

Use consistent paginated tables, loading/error/empty states, confirmation dialogs, accessible Arabic RTL forms. Analytics deliberately basic: revenue, counts, pending/processing/shipped/delivered, recent orders; no BI forecasting/segmentation.
