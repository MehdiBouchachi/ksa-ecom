import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb, pgConstraint, pgErrorCode, withTx } from "../db";
import { passwordResetTokens, users } from "../db/schema";
import { AppError } from "../lib/errors";
import { log } from "../lib/log";
import { rateLimit, resetRateLimit } from "../lib/rate-limit";
import { enqueueNotification } from "../notifications/enqueue";
import { dummyVerify, hashPassword, verifyPassword } from "./password";

export type AuthUser = { id: string; email: string; role: "CUSTOMER" | "MANAGER" | "ADMIN"; fullName: string; sessionVersion: number };

/** Used by Auth.js Credentials authorize(). Throttled per email and per IP. */
export async function verifyCredentials(email: string, password: string, ip: string): Promise<AuthUser | null> {
  const e = email.trim().toLowerCase();
  await rateLimit(`login:ip:${ip}`, 30, 15 * 60);
  await rateLimit(`login:email:${e}`, 8, 15 * 60);
  const [u] = await getDb().select().from(users).where(sql`lower(${users.email}) = ${e}`).limit(1);
  if (!u) return dummyVerify(password).then(() => null);
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok || u.status !== "ACTIVE") return null;
  await resetRateLimit(`login:email:${e}`);
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  return { id: u.id, email: u.email, role: u.role, fullName: u.fullName, sessionVersion: u.sessionVersion };
}

/** Public sign-up: role is ALWAYS CUSTOMER (no role input accepted). */
export async function registerCustomer(input: { name: string; email: string; phone?: string; password: string }) {
  try {
    const [u] = await getDb()
      .insert(users)
      .values({ email: input.email, fullName: input.name, phone: input.phone ?? null, passwordHash: await hashPassword(input.password), role: "CUSTOMER" })
      .returning({ id: users.id });
    return u!;
  } catch (e) {
    if (pgErrorCode(e) === "23505" && pgConstraint(e) === "users_email_lower_uq") throw new AppError("CONFLICT", "البريد الإلكتروني مسجل مسبقًا");
    throw e;
  }
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Always resolves silently (no account enumeration). Stores only a hash of the token. */
export async function requestPasswordReset(email: string) {
  const e = email.trim().toLowerCase();
  await rateLimit(`reset:${e}`, 3, 60 * 60);
  const [u] = await getDb().select().from(users).where(sql`lower(${users.email}) = ${e}`).limit(1);
  if (!u || u.status !== "ACTIVE") return;
  const token = randomBytes(32).toString("base64url");
  await withTx(async (tx) => {
    const [row] = await tx
      .insert(passwordResetTokens)
      .values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) })
      .returning({ id: passwordResetTokens.id });
    await enqueueNotification(tx, { eventKey: `password-reset:${row!.id}`, kind: "PASSWORD_RESET", recipient: u.email, payload: { token } });
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const hash = sha256(token);
  await withTx(async (tx) => {
    const [t] = await tx
      .select()
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, hash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
      .for("update");
    if (!t) throw new AppError("VALIDATION_FAILED", "رابط إعادة التعيين غير صالح أو منتهي");
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, t.id));
    await tx
      .update(users)
      .set({ passwordHash: await hashPassword(newPassword), sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, t.userId));
  });
  log.info("auth.password_reset");
}

export async function changePassword(userId: string, current: string, next: string) {
  const [u] = await getDb().select().from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(current, u.passwordHash))) throw new AppError("VALIDATION_FAILED", "كلمة المرور الحالية غير صحيحة");
  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(next), sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Own profile only (userId comes from the verified session, never from input). */
export async function getProfile(userId: string) {
  const [u] = await getDb()
    .select({ id: users.id, email: users.email, fullName: users.fullName, phone: users.phone, avatarKey: users.avatarKey, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, userId));
  return u ?? null;
}

export async function updateProfile(userId: string, patch: { name?: string; phone?: string | null; avatarKey?: string | null }) {
  const set: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  if (patch.name !== undefined) set.fullName = patch.name;
  if (patch.phone !== undefined) set.phone = patch.phone;
  if (patch.avatarKey !== undefined) set.avatarKey = patch.avatarKey;
  await getDb().update(users).set(set).where(eq(users.id, userId));
  return getProfile(userId);
}

/** Email change requires the current password; unique (case-insensitive) email enforced by DB. */
export async function changeEmail(userId: string, newEmail: string, currentPassword: string) {
  const [u] = await getDb().select().from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(currentPassword, u.passwordHash))) throw new AppError("VALIDATION_FAILED", "كلمة المرور الحالية غير صحيحة");
  try {
    await getDb().update(users).set({ email: newEmail.trim().toLowerCase(), updatedAt: new Date() }).where(eq(users.id, userId));
  } catch (e) {
    if (pgErrorCode(e) === "23505") throw new AppError("CONFLICT", "البريد الإلكتروني مستخدم");
    throw e;
  }
}
