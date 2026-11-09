import { listColors, saveColor } from "@/server/admin/catalog";
import { staffRoute } from "@/server/lib/admin-route";
import { ok } from "@/server/lib/http";

export const GET = staffRoute(async () => ok(await listColors()));
export const POST = staffRoute(async (req, u) => ok(await saveColor(u.id, await req.json()), { status: 201 }));
