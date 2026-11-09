import { getFacets } from "@/server/catalog";
import { ok, route } from "@/server/lib/http";

export const dynamic = "force-dynamic";
export const GET = route(async () => ok(await getFacets()));
