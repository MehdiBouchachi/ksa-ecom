import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";
import { listOrdersAdmin } from "@/server/orders/queries";

export const GET = staffRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  const r = await listOrdersAdmin({
    status: sp.get("status") ?? undefined,
    payment: sp.get("payment") ?? undefined,
    q: sp.get("q")?.slice(0, 100) ?? undefined,
    page: Math.max(1, Number(sp.get("page") ?? 1) || 1),
  });
  return ok(r.items, { meta: { total: r.total, page: r.page, pageSize: r.pageSize } });
});
