"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { forgotPasswordSchema, registerSchema, resetPasswordSchema } from "@saudi-ecom/contracts";
import { signIn, signOut } from "@/auth";
import { registerCustomer, requestPasswordReset, resetPassword } from "@/server/auth/accounts";
import { isAppError } from "@/server/lib/errors";
import { clientIp, rateLimit } from "@/server/lib/rate-limit";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

/** Only same-site relative redirects (prevents open redirects). */
function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/account/orders";
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message.length < 80 ? i.message : "قيمة غير صالحة";
  return out;
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  try {
    await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirectTo: safeNext(fd.get("next")) });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      return { error: code === "rate_limited" ? "محاولات كثيرة، حاول بعد 15 دقيقة" : "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
    }
    throw e; // NEXT_REDIRECT on success
  }
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  if (fd.get("privacy") !== "on") return { fieldErrors: { privacy: "يجب الاطلاع على سياسة الخصوصية والموافقة عليها" } };
  try {
    await rateLimit(`register:${clientIp(await headers())}`, 10, 60 * 60);
    await registerCustomer(parsed.data);
  } catch (e) {
    if (isAppError(e)) return { error: e.message };
    throw e;
  }
  try {
    await signIn("credentials", { email: parsed.data.email, password: parsed.data.password, redirectTo: safeNext(fd.get("next")) });
  } catch (e) {
    if (e instanceof AuthError) return { error: "تم إنشاء الحساب، يرجى تسجيل الدخول" };
    throw e;
  }
}

export async function forgotAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  try {
    await requestPasswordReset(parsed.data.email);
  } catch (e) {
    if (!(isAppError(e) && e.code === "RATE_LIMITED")) throw e;
  }
  return { ok: true }; // identical response whether or not the account exists
}

export async function resetAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return { ok: true };
  } catch (e) {
    if (isAppError(e)) return { error: e.message };
    throw e;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
