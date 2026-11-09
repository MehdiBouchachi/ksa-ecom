import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/account/auth-form";
import { loginAction } from "../actions";

export const metadata: Metadata = { title: "تسجيل الدخول", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? "";
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
      <h1 className="mb-6 text-2xl font-bold">تسجيل الدخول</h1>
      <AuthForm
        action={loginAction}
        hidden={{ next }}
        submit="دخول"
        fields={[
          { name: "email", label: "البريد الإلكتروني", type: "email", autoComplete: "email", dir: "ltr" },
          { name: "password", label: "كلمة المرور", type: "password", autoComplete: "current-password" },
        ]}
        footer={
          <div className="flex justify-between text-sm">
            <Link href="/auth/forgot-password" className="text-primary">نسيت كلمة المرور؟</Link>
            <Link href={`/auth/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-primary">إنشاء حساب</Link>
          </div>
        }
      />
    </div>
  );
}
