import { teamMemberCreateSchema } from "@saudi-ecom/contracts";
import { createTeamMember, listTeam } from "@/server/admin/people";
import { adminRoute } from "@/server/lib/admin-route";
import { ok, readJson } from "@/server/lib/http";

/** ADMIN ONLY — staff accounts and roles. */
export const GET = adminRoute(async (_req, u) => ok(await listTeam(u)));
export const POST = adminRoute(async (req, u) => ok(await createTeamMember(u, await readJson(req, teamMemberCreateSchema)), { status: 201 }));
