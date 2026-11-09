import { requireUser } from "@/server/auth/guards";
import { ok, route } from "@/server/lib/http";
import { listOrdersForUser } from "@/server/orders/queries";

export const GET = route(async (req) => {
  const u = await requireUser();
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1) || 1);
  const r = await listOrdersForUser(u.id, page);
  return ok(r.items, { meta: { total: r.total, page: r.page, pageSize: r.pageSize } });
});
