import { listTaxonomyAdmin, saveTaxonomy } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

export const GET = staffRoute(async () => ok(await listTaxonomyAdmin("collections")));
export const POST = staffRoute(async (req, u) => ok(await saveTaxonomy(u.id, "collections", await req.json()), { status: 201 }));
