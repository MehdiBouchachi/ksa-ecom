import { listAdjustments, listVariantsAdmin } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

export const GET = staffRoute(async () => {
  const [variants, adjustments] = await Promise.all([listVariantsAdmin(), listAdjustments(undefined, 50)]);
  return ok({ variants: variants.map((v) => ({ ...v, available: (v.onHand ?? 0) - (v.reserved ?? 0) })), adjustments });
});
