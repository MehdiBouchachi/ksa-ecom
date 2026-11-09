import { orderStatusChangeSchema } from "@saudi-ecom/contracts";
import { staffRoute } from "@/server/lib/admin-route";
import { ok, readJson } from "@/server/lib/http";
import { changeOrderStatus } from "@/server/orders/queries";

export const POST = staffRoute<{ id: string }>(async (req, u, { id }) => {
  const body = await readJson(req, orderStatusChangeSchema);
  return ok(await changeOrderStatus(id, body.status, u, body.note));
});
