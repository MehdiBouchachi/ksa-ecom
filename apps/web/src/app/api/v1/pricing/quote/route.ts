import { pricingQuoteSchema } from "@saudi-ecom/contracts";
import { ok, readJson, route } from "@/server/lib/http";
import { clientIp, rateLimit } from "@/server/lib/rate-limit";
import { quoteCart } from "@/server/pricing";

/** Preview only — never reserves stock. Browser-supplied prices are not accepted. */
export const POST = route(async (req) => {
  await rateLimit(`quote:${clientIp(req.headers)}`, 120, 60);
  const body = await readJson(req, pricingQuoteSchema);
  return ok(await quoteCart(body.items));
});
