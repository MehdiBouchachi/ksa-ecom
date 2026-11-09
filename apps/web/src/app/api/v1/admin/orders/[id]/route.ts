import { staffRoute } from "@/server/lib/admin-route";
import { AppError } from "@/server/lib/errors";
import { ok } from "@/server/lib/http";
import { getOrderAdmin } from "@/server/orders/queries";

export const GET = staffRoute<{ id: string }>(async (_req, _u, { id }) => {
  const o = await getOrderAdmin(id);
  if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود");
  return ok(o);
});
