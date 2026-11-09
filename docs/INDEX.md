# Optimized specification index
This pack replaces repeated reading of the 91-KB original requirements document. No requirement below asks Claude to read every file in one turn. **Read `STATE.md` and task-specific references only.**

| Need | Read |
|---|---|
| Scope + pages | `PRODUCT.md` |
| Single runtime / deployment | `ARCHITECTURE.md` |
| DB schema and HTTP contracts | `CONTRACTS.md` |
| Variants + last-unit concurrency | `INVENTORY.md` |
| Admin/Manager pages | `ADMIN.md` |
| Payment, Aramex, email | `INTEGRATIONS.md` |
| SEO, performance, law, tests | `QUALITY.md` |
| Test IDs | `ACCEPTANCE.md` |
| Task order + targeted reading | `TASKS.md` |
| Status + unknown decisions | `STATE.md` |

**Product invariants:** one physical product family; full listing/search/filters/categories/brands/collections and wishlist still required; color+size variants; retail and bulk quantity tiers. Do not remove catalog features merely because the main product family is singular.

Production launch depends on real merchant data, verified PSP + Aramex accounts and applicable tax/privacy compliance review. No deadline or cost is specified.
