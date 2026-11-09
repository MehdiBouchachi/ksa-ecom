import { listCustomers } from "@/server/admin/people";
import { adminRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

/** ADMIN ONLY — customer directory. Managers receive 403. */
export const GET = adminRoute(async (req, u) => {
  const sp = new URL(req.url).searchParams;
  const r = await listCustomers(u, { q: sp.get("q")?.slice(0, 100) ?? undefined, page: Math.max(1, Number(sp.get("page") ?? 1) || 1) });
  return ok(r.items, { meta: { total: r.total, page: r.page, pageSize: r.pageSize } });
});
