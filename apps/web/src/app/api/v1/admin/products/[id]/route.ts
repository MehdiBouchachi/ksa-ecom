import { getProductAdmin, saveProduct } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { AppError } from "@/server/lib/errors";
import { ok } from "@/server/lib/http";

export const GET = staffRoute<{ id: string }>(async (_req, _u, { id }) => {
  const p = await getProductAdmin(id);
  if (!p) throw new AppError("NOT_FOUND", "غير موجود");
  return ok(p);
});
export const PATCH = staffRoute<{ id: string }>(async (req, u, { id }) => ok(await saveProduct(u.id, { ...(await req.json()), id })));
