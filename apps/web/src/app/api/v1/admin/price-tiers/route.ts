import { addTier, listTiers } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

export const GET = staffRoute(async (req) => ok(await listTiers(new URL(req.url).searchParams.get("variantId") ?? undefined)));
export const POST = staffRoute(async (req, u) => ok(await addTier(u.id, await req.json()), { status: 201 }));
