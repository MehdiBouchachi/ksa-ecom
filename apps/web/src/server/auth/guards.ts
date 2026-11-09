import { eq } from "drizzle-orm";
import type { Role } from "@saudi-ecom/contracts";
import { getDb } from "../db";
import { users } from "../db/schema";
import { AppError } from "../lib/errors";
import { getSessionIdentity } from "./session";

export type CurrentUser = { id: string; email: string; role: Role; fullName: string; phone: string | null };

/** Resolves the session AND re-validates the user's role/status/session version in PostgreSQL. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const ident = await getSessionIdentity();
  if (!ident) return null;
  const [u] = await getDb()
    .select({ id: users.id, email: users.email, role: users.role, status: users.status, fullName: users.fullName, phone: users.phone, sv: users.sessionVersion })
    .from(users)
    .where(eq(users.id, ident.id))
    .limit(1);
  if (!u || u.status !== "ACTIVE" || u.sv !== ident.sv) return null;
  return { id: u.id, email: u.email, role: u.role, fullName: u.fullName, phone: u.phone };
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) throw new AppError("UNAUTHENTICATED", "يجب تسجيل الدخول");
  return u;
}

export function assertRole(u: CurrentUser, roles: readonly Role[]): void {
  if (!roles.includes(u.role)) throw new AppError("FORBIDDEN", "ليست لديك صلاحية");
}

/** Admin + Manager: operational back office. */
export async function requireStaff(): Promise<CurrentUser> {
  const u = await requireUser();
  assertRole(u, ["ADMIN", "MANAGER"]);
  return u;
}

/** Admin only: customer directory, team/role management, privileged settings. */
export async function requireAdmin(): Promise<CurrentUser> {
  const u = await requireUser();
  assertRole(u, ["ADMIN"]);
  return u;
}

export const isStaff = (u: CurrentUser | null) => !!u && (u.role === "ADMIN" || u.role === "MANAGER");

/** For Admin-only PAGES: returns the admin, or null so the page renders a 403 view (no data loaded). */
export async function adminOrNull(): Promise<CurrentUser | null> {
  const u = await requireStaff();
  return u.role === "ADMIN" ? u : null;
}
