import { assertCronSignature, ok, route } from "@/server/lib/http";
import { pruneRateLimits, reconcileExpiredHolds } from "@/server/orders/reconcile";

/** Signed, bounded, idempotent maintenance endpoint triggered by Hostinger cron (scripts/cron.sh). */
export const maxDuration = 60;
export const POST = route(async (req) => {
  assertCronSignature(req);
  const startedAt = Date.now();
  const report = await reconcileExpiredHolds();
  await pruneRateLimits();
  return ok({ report, ms: Date.now() - startedAt });
});
