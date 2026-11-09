import { profileUpdateSchema } from "@saudi-ecom/contracts";
import { getProfile, updateProfile } from "@/server/auth/accounts";
import { requireUser } from "@/server/auth/guards";
import { assertSameOrigin, ok, readJson, route } from "@/server/lib/http";

export const GET = route(async () => {
  const u = await requireUser();
  return ok(await getProfile(u.id));
});

export const PATCH = route(async (req) => {
  assertSameOrigin(req);
  const u = await requireUser();
  const patch = await readJson(req, profileUpdateSchema);
  return ok(await updateProfile(u.id, patch));
});
