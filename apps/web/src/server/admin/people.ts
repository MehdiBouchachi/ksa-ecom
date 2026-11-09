import { and, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { getDb, pgErrorCode, withTx } from "../db";
import { auditLogs, orders, users } from "../db/schema";
import { assertRole, type CurrentUser } from "../auth/guards";
import { hashPassword } from "../auth/password";
import { AppError } from "../lib/errors";

/*
 * ADMIN-ONLY services. Each function re-asserts the ADMIN role itself (defense in depth),
 * so a Manager can never reach them even through a mis-wired route or server action.
 */

export async function listCustomers(actor: CurrentUser, opts: { q?: string; page?: number; pageSize?: number } = {}) {
  assertRole(actor, ["ADMIN"]);
  const page = opts.page ?? 1;
  const pageSize = Math.min(opts.pageSize ?? 25, 100);
  const conds = [eq(users.role, "CUSTOMER")];
  if (opts.q) {
    const like = `%${opts.q.replace(/[\\%_]/g, "\\$&")}%`;
    conds.push(or(ilike(users.email, like), ilike(users.fullName, like), ilike(users.phone, like))!);
  }
  const where = and(...conds);
  const [rows, total] = await Promise.all([
    getDb()
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
        orders: sql<number>`(select count(*)::int from orders o where o.user_id = ${users.id})`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    getDb().select({ n: count() }).from(users).where(where),
  ]);
  return { items: rows, total: total[0]?.n ?? 0, page, pageSize };
}

export async function getCustomer(actor: CurrentUser, id: string) {
  assertRole(actor, ["ADMIN"]);
  const [u] = await getDb()
    .select({ id: users.id, email: users.email, fullName: users.fullName, phone: users.phone, status: users.status, createdAt: users.createdAt, lastLoginAt: users.lastLoginAt })
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "CUSTOMER")));
  if (!u) return null;
  const recentOrders = await getDb()
    .select({ id: orders.id, reference: orders.reference, orderStatus: orders.orderStatus, paymentStatus: orders.paymentStatus, totalHalalas: orders.totalHalalas, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.userId, id))
    .orderBy(desc(orders.createdAt))
    .limit(20);
  return { ...u, orders: recentOrders };
}

export async function setCustomerStatus(actor: CurrentUser, id: string, status: "ACTIVE" | "DISABLED") {
  assertRole(actor, ["ADMIN"]);
  const rows = await getDb()
    .update(users)
    .set({ status, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(and(eq(users.id, id), eq(users.role, "CUSTOMER")))
    .returning({ id: users.id });
  if (!rows.length) throw new AppError("NOT_FOUND", "غير موجود");
  await getDb().insert(auditLogs).values({ actorId: actor.id, action: "customer.status", entity: "user", entityId: id, data: { status } });
}

export async function listTeam(actor: CurrentUser) {
  assertRole(actor, ["ADMIN"]);
  return getDb()
    .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role, status: users.status, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
    .from(users)
    .where(inArray(users.role, ["ADMIN", "MANAGER"]))
    .orderBy(users.role, users.fullName);
}

export async function createTeamMember(actor: CurrentUser, input: { name: string; email: string; role: "ADMIN" | "MANAGER"; password: string }) {
  assertRole(actor, ["ADMIN"]);
  try {
    const [u] = await getDb()
      .insert(users)
      .values({ email: input.email, fullName: input.name, role: input.role, passwordHash: await hashPassword(input.password) })
      .returning({ id: users.id });
    await getDb().insert(auditLogs).values({ actorId: actor.id, action: "team.create", entity: "user", entityId: u!.id, data: { role: input.role } });
    return u!;
  } catch (e) {
    if (pgErrorCode(e) === "23505") throw new AppError("CONFLICT", "البريد الإلكتروني مستخدم");
    throw e;
  }
}

export async function updateTeamMember(actor: CurrentUser, id: string, patch: { role?: "ADMIN" | "MANAGER"; status?: "ACTIVE" | "DISABLED" }) {
  assertRole(actor, ["ADMIN"]);
  return withTx(async (tx) => {
    // Lock all admins to evaluate "last active admin" safely under concurrency.
    const admins = await tx.select({ id: users.id, status: users.status }).from(users).where(eq(users.role, "ADMIN")).for("update");
    const [target] = await tx.select().from(users).where(and(eq(users.id, id), inArray(users.role, ["ADMIN", "MANAGER"]))).for("update");
    if (!target) throw new AppError("NOT_FOUND", "غير موجود");
    if (id === actor.id && (patch.status === "DISABLED" || patch.role === "MANAGER")) throw new AppError("CONFLICT", "لا يمكنك تقليل صلاحياتك أو تعطيل حسابك");
    const activeAdmins = admins.filter((a) => a.status === "ACTIVE" && a.id !== id).length;
    const demoting = target.role === "ADMIN" && (patch.role === "MANAGER" || patch.status === "DISABLED");
    if (demoting && activeAdmins === 0) throw new AppError("CONFLICT", "يجب أن يبقى مدير واحد نشط على الأقل");
    await tx
      .update(users)
      .set({ ...(patch.role ? { role: patch.role } : {}), ...(patch.status ? { status: patch.status } : {}), sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, id));
    await tx.insert(auditLogs).values({ actorId: actor.id, action: "team.update", entity: "user", entityId: id, data: patch });
    return { id };
  });
}

/** Utility for tests/ops: count active admins. */
export async function activeAdminCount() {
  const [r] = await getDb().select({ n: count() }).from(users).where(and(eq(users.role, "ADMIN"), eq(users.status, "ACTIVE"), ne(users.email, "")));
  return r?.n ?? 0;
}

/** Invitation: creates the staff account with an unusable random password and emails a set-password link. */
export async function inviteTeamMember(actor: CurrentUser, input: { name: string; email: string; role: "ADMIN" | "MANAGER" }) {
  assertRole(actor, ["ADMIN"]);
  const { randomBytes } = await import("node:crypto");
  const u = await createTeamMember(actor, { ...input, password: randomBytes(32).toString("base64url") });
  const { requestPasswordReset } = await import("../auth/accounts");
  await requestPasswordReset(input.email);
  return u;
}
