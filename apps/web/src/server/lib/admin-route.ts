import type { CurrentUser } from "../auth/guards";
import { requireAdmin, requireStaff } from "../auth/guards";
import { assertSameOrigin, route } from "./http";

type Ctx<P> = { params: Promise<P> };

/** Staff (Admin+Manager) route; mutations also get an origin check. */
export function staffRoute<P = Record<string, string>>(fn: (req: Request, user: CurrentUser, params: P) => Promise<Response>) {
  return route<Ctx<P>>(async (req, ctx) => {
    if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
    const user = await requireStaff();
    return fn(req, user, (await ctx?.params) as P);
  });
}

/** Admin-only route. */
export function adminRoute<P = Record<string, string>>(fn: (req: Request, user: CurrentUser, params: P) => Promise<Response>) {
  return route<Ctx<P>>(async (req, ctx) => {
    if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
    const user = await requireAdmin();
    return fn(req, user, (await ctx?.params) as P);
  });
}
