import { z } from "zod";
import { staffRoute } from "@/server/lib/admin-route";
import { ok, readJson } from "@/server/lib/http";
import { createShipmentForOrder, listShipments } from "@/server/shipping/service";

export const GET = staffRoute(async () => ok(await listShipments()));
export const POST = staffRoute(async (req, u) => {
  const { orderId } = await readJson(req, z.object({ orderId: z.uuid() }));
  const r = await createShipmentForOrder(orderId, u.id);
  return ok(r, { status: r.created ? 201 : 200 });
});
