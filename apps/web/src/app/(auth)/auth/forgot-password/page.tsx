import type { Metadata } from "next";
import { AuthForm } from "@/components/account/auth-form";
import { forgotAction } from "../actions";

export const metadata: Metadata = { title: "استعادة كلمة المرور", robots: { index: false, follow: false } };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6">
      <h1 className="mb-6 text-2xl font-bold">استعادة كلمة المرور</h1>
      <AuthForm
        action={forgotAction}
        submit="أرسل رابط الاستعادة"
        okMessage="إذا كان البريد مسجلًا لدينا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور خلال دقائق."
        fields={[{ name: "email", label: "البريد الإلكتروني", type: "email", autoComplete: "email", dir: "ltr" }]}
      />
    </div>
  );
}
