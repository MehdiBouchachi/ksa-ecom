import { paymentSessionSchema } from "@saudi-ecom/contracts";
import { requireUser } from "@/server/auth/guards";
import { assertSameOrigin, ok, readJson, route } from "@/server/lib/http";
import { createPaymentSession } from "@/server/payments/service";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const user = await requireUser();
  const { orderReference } = await readJson(req, paymentSessionSchema);
  const s = await createPaymentSession(user.id, orderReference);
  return ok({ redirectUrl: s.redirectUrl, alreadyPaid: !!s.alreadyPaid });
});
