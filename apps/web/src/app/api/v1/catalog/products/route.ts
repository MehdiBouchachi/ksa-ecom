import { catalogQuerySchema } from "@saudi-ecom/contracts";
import { listCatalog } from "@/server/catalog";
import { ok, route } from "@/server/lib/http";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const q = catalogQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const r = await listCatalog(q);
  return ok(r.items, { meta: { total: r.total, page: r.page, pageSize: r.pageSize } });
});
