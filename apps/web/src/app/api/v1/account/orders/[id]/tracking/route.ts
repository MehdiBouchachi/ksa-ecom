import { requireUser } from "@/server/auth/guards";
import { AppError } from "@/server/lib/errors";
import { ok, route } from "@/server/lib/http";
import { getTrackingForUser } from "@/server/shipping/service";

export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const u = await requireUser();
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "الطلب غير موجود");
  const t = await getTrackingForUser(u.id, id);
  if (!t) throw new AppError("NOT_FOUND", "الطلب غير موجود");
  return ok(t);
});
