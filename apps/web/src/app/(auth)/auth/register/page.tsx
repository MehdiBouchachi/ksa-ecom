import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/account/auth-form";
import { registerAction } from "../actions";

export const metadata: Metadata = { title: "إنشاء حساب", robots: { index: false, follow: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next ?? "";
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
      <h1 className="mb-6 text-2xl font-bold">إنشاء حساب</h1>
      <AuthForm
        action={registerAction}
        hidden={{ next }}
        submit="إنشاء الحساب"
        fields={[
          { name: "name", label: "الاسم الكامل", autoComplete: "name" },
          { name: "email", label: "البريد الإلكتروني", type: "email", autoComplete: "email", dir: "ltr" },
          { name: "phone", label: "رقم الجوال (اختياري)", type: "tel", autoComplete: "tel", dir: "ltr", hint: "مثال: 05XXXXXXXX" },
          { name: "password", label: "كلمة المرور", type: "password", autoComplete: "new-password", hint: "10 أحرف على الأقل" },
        ]}
        checkbox={{ name: "privacy", label: <>اطلعت على <Link href="/policies/privacy" target="_blank" className="text-primary underline">سياسة الخصوصية</Link> وأوافق على معالجة بياناتي لغرض تنفيذ الطلبات.</> }}
        footer={<p className="text-center text-sm">لديك حساب؟ <Link href="/auth/login" className="text-primary">سجّل الدخول</Link></p>}
      />
    </div>
  );
}
