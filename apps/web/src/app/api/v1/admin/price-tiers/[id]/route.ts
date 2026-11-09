import { deactivateTier } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

export const DELETE = staffRoute<{ id: string }>(async (_req, u, { id }) => {
  await deactivateTier(u.id, id);
  return ok({ deactivated: true });
});
