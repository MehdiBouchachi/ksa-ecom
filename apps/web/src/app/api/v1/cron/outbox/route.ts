import { assertCronSignature, ok, route } from "@/server/lib/http";
import { processOutbox } from "@/server/notifications/outbox";

/** Signed, bounded, idempotent maintenance endpoint triggered by Hostinger cron (scripts/cron.sh). */
export const maxDuration = 60;
export const POST = route(async (req) => {
  assertCronSignature(req);
  const startedAt = Date.now();
  const report = await processOutbox();
  return ok({ report, ms: Date.now() - startedAt });
});
