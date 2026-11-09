import { assertCronSignature, ok, route } from "@/server/lib/http";
import { syncShipments } from "@/server/shipping/service";

/** Signed, bounded, idempotent maintenance endpoint triggered by Hostinger cron (scripts/cron.sh). */
export const maxDuration = 60;
export const POST = route(async (req) => {
  assertCronSignature(req);
  const startedAt = Date.now();
  const report = await syncShipments();
  return ok({ report, ms: Date.now() - startedAt });
});
