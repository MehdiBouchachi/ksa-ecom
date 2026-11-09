import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/account/auth-form";
import { resetAction } from "../actions";

export const metadata: Metadata = { title: "تعيين كلمة مرور جديدة", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
      <h1 className="mb-6 text-2xl font-bold">تعيين كلمة مرور جديدة</h1>
      <AuthForm
        action={resetAction}
        hidden={{ token }}
        submit="حفظ كلمة المرور"
        okMessage="تم تغيير كلمة المرور. يمكنك تسجيل الدخول الآن."
        fields={[{ name: "password", label: "كلمة المرور الجديدة", type: "password", autoComplete: "new-password", hint: "10 أحرف على الأقل" }]}
        footer={<Link href="/auth/login" className="block text-center text-sm text-primary">العودة لتسجيل الدخول</Link>}
      />
    </div>
  );
}
