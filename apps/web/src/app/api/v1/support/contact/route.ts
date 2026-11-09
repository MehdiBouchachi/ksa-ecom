import { contactSchema } from "@saudi-ecom/contracts";
import { getCurrentUser } from "@/server/auth/guards";
import { assertSameOrigin, ok, readJson, route } from "@/server/lib/http";
import { clientIp } from "@/server/lib/rate-limit";
import { submitContact } from "@/server/support";

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const body = await readJson(req, contactSchema);
  const u = await getCurrentUser();
  return ok(await submitContact(body, clientIp(req.headers), u?.id ?? null), { status: 201 });
});
