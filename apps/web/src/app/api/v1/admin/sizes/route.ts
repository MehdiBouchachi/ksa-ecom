import { listSizes, saveSize } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

export const GET = staffRoute(async () => ok(await listSizes()));
export const POST = staffRoute(async (req, u) => ok(await saveSize(u.id, await req.json()), { status: 201 }));
