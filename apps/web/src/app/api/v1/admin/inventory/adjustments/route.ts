import { inventoryAdjustmentSchema } from "@saudi-ecom/contracts";
import { adjustStock } from "@/server/inventory";
import { staffRoute } from "@/server/lib/admin-route";
import { ok, readJson } from "@/server/lib/http";

export const POST = staffRoute(async (req, u) => {
  const body = await readJson(req, inventoryAdjustmentSchema);
  return ok(await adjustStock({ ...body, actorId: u.id }), { status: 201 });
});
