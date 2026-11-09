import { requireUser } from "@/server/auth/guards";
import { AppError } from "@/server/lib/errors";
import { ok, route } from "@/server/lib/http";
import { getOrderForUser } from "@/server/orders/queries";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const u = await requireUser();
  const o = await getOrderForUser(u.id, (await params).id);
  if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود"); // 404 for other users' orders too
  return ok(o);
});
