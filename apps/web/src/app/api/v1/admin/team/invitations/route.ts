import { teamMemberCreateSchema } from "@saudi-ecom/contracts";
import { inviteTeamMember } from "@/server/admin/people";
import { adminRoute } from "@/server/lib/admin-route";
import { ok, readJson } from "@/server/lib/http";

export const POST = adminRoute(async (req, u) => {
  const body = await readJson(req, teamMemberCreateSchema.omit({ password: true }));
  return ok(await inviteTeamMember(u, body), { status: 201 });
});
