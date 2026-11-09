import { orderCancelSchema } from "@saudi-ecom/contracts";
import { staffRoute } from "@/server/lib/admin-route";
import { ok, readJson } from "@/server/lib/http";
import { cancelOrder } from "@/server/orders/queries";

export const POST = staffRoute<{ id: string }>(async (req, u, { id }) => {
  const body = await readJson(req, orderCancelSchema);
  return ok(await cancelOrder(id, u, body.reason, body.restock));
});
