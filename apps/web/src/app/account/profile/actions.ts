"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changePasswordSchema, email as emailSchema, profileUpdateSchema } from "@saudi-ecom/contracts";
import { changeEmail, changePassword, updateProfile } from "@/server/auth/accounts";
import { requireUser } from "@/server/auth/guards";
import { isAppError } from "@/server/lib/errors";
import type { FormState } from "@/app/(auth)/auth/actions";

const errs = (issues: { path: PropertyKey[]; message: string }[]) => Object.fromEntries(issues.map((i) => [String(i.path[0]), i.message.length < 80 ? i.message : "قيمة غير صالحة"]));

export async function saveProfile(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const p = profileUpdateSchema.safeParse({ name: fd.get("name"), phone: fd.get("phone") ?? "" });
  if (!p.success) return { fieldErrors: errs(p.error.issues) };
  await updateProfile(u.id, p.data);
  revalidatePath("/account/profile");
  return { ok: true };
}

export async function saveEmail(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const p = z.object({ email: emailSchema, currentPassword: z.string().min(1) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { fieldErrors: errs(p.error.issues) };
  try {
    await changeEmail(u.id, p.data.email, p.data.currentPassword);
    return { ok: true };
  } catch (e) {
    if (isAppError(e)) return { error: e.message };
    throw e;
  }
}

export async function savePassword(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const p = changePasswordSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { fieldErrors: errs(p.error.issues) };
  try {
    await changePassword(u.id, p.data.currentPassword, p.data.newPassword);
    return { ok: true }; // session version bumped => other sessions signed out
  } catch (e) {
    if (isAppError(e)) return { error: e.message };
    throw e;
  }
}
