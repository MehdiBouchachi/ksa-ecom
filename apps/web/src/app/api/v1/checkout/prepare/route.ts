import { checkoutPrepareSchema, idempotencyKeySchema } from "@saudi-ecom/contracts";
import { requireUser } from "@/server/auth/guards";
import { AppError } from "@/server/lib/errors";
import { assertSameOrigin, ok, readJson, route } from "@/server/lib/http";
import { rateLimit } from "@/server/lib/rate-limit";
import { prepareCheckout } from "@/server/orders/checkout";

/**
 * Account required (guest checkout pending merchant approval). Requires Idempotency-Key.
 * Any price/total fields sent by the browser are stripped by the schema and ignored.
 */
export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const keyParse = idempotencyKeySchema.safeParse(req.headers.get("idempotency-key") ?? "");
  if (!keyParse.success) throw new AppError("VALIDATION_FAILED", "Idempotency-Key header مطلوب");
  await rateLimit(`checkout:${user.id}`, 20, 10 * 60);
  const input = await readJson(req, checkoutPrepareSchema);
  const { result, replayed } = await prepareCheckout(user, input, keyParse.data);
  return ok(result, { status: replayed ? 200 : 201, headers: replayed ? { "Idempotent-Replayed": "true" } : {} });
});
