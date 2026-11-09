import { staffRoute } from "@/server/lib/admin-route";
import { AppError } from "@/server/lib/errors";
import { ok } from "@/server/lib/http";
import { refreshShipment } from "@/server/shipping/service";

export const POST = staffRoute<{ id: string }>(async (_req, _u, { id }) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "غير موجود");
  return ok(await refreshShipment(id));
});
