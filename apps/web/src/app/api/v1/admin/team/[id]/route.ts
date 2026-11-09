import { teamMemberUpdateSchema } from "@saudi-ecom/contracts";
import { updateTeamMember } from "@/server/admin/people";
import { adminRoute } from "@/server/lib/admin-route";
import { AppError } from "@/server/lib/errors";
import { ok, readJson } from "@/server/lib/http";

export const PATCH = adminRoute<{ id: string }>(async (req, u, { id }) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "غير موجود");
  return ok(await updateTeamMember(u, id, await readJson(req, teamMemberUpdateSchema)));
});
