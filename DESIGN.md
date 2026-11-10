# Design context

The product is an Arabic first Saudi commerce storefront with an operational admin area. Admin navigation should help staff move quickly among sales, catalog, store, and people tasks.

## Admin navigation

- The shared owner is `apps/web/src/components/admin/shell.tsx`; its surface styling lives in `apps/web/src/app/globals.css`.
- Use a soft neutral navigation surface with dark text, a small green brand mark, and a quiet green active row. Compact links and short section labels keep the navigation visible at common desktop heights.
- Keep route labels localized through `apps/web/src/i18n/admin.ts` and preserve RTL and LTR behavior.
- Active pages use a pale green row. Keyboard focus must remain visible. The mobile navigation is a modal drawer with Escape, focus containment, and a close button. The admin shell fills the viewport. The sidebar navigation and the page content each scroll within their bounded pane, while the brand, account controls, and top bar stay visible.
- Keep storefront tokens independent from the admin theme.

## Admin dashboard

- The admin canvas is nearly white (`#fafbfa`) with dark ink (`#202521`), fine borders (`#e5e8e4`), and a restrained green primary (`#28744e`). These tokens are scoped to `.admin-theme` in `globals.css`.
- The overview uses a plain title row and a single divided metric strip. Charts and lists sit on white surfaces with fine borders, modest corners, and no decorative shadows. Reserve colors for semantic status and the primary action.
- The admin top bar names the current navigation section and page. Shared forms, tables, and actions use consistent compact sizing and border treatment. Order status filters use a quiet underline selection so many options remain easy to scan.
- The overview places common actions directly below the metrics, before charts and recent activity. Metric values wrap instead of truncating; the add product action opens the product form directly.
- Settings content navigation uses the same underline pattern as order filters. Informational callouts and non-status role or pricing labels stay neutral; warning, error, success, and inventory risk retain semantic color.
- Admin tables use clear, quiet headers, readable row spacing, visible focus, and explicit row actions. The orders table keeps search, status, payment, sort, and pagination in the URL; its sort options are newest, oldest, highest total, and lowest total.
- Recent orders use a semantic table when space allows, with reference and date, customer, a prominent order state with payment and shipping as secondary text, total, and an explicit view action. Narrow screens use compact linked rows; the full orders page remains one click away.
- The full orders list uses the same status hierarchy as recent orders. At tablet widths, linked order cards replace the table so names and statuses remain readable without horizontal scrolling.
