import { listVariantsAdmin, saveVariant } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

export const GET = staffRoute(async (req) => ok(await listVariantsAdmin(new URL(req.url).searchParams.get("productId") ?? undefined)));
export const POST = staffRoute(async (req, u) => ok(await saveVariant(u.id, await req.json()), { status: 201 }));
