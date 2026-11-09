import Link from "next/link";
import { AuthForm } from "@/components/account/auth-form";
import { getProfile } from "@/server/auth/accounts";
import { requireUser } from "@/server/auth/guards";
import { saveEmail, savePassword, saveProfile } from "./actions";

export const metadata = { title: "الملف الشخصي" };

export default async function ProfilePage() {
  const user = await requireUser();
  const p = await getProfile(user.id);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الملف الشخصي</h1>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 font-bold">البيانات الأساسية</h2>
        <p className="mb-3 text-sm text-muted-foreground">الاسم الحالي: {p?.fullName} · الجوال: <span dir="ltr">{p?.phone ?? "—"}</span></p>
        <AuthForm action={saveProfile} submit="حفظ" okMessage="تم الحفظ." fields={[{ name: "name", label: "الاسم", autoComplete: "name" }, { name: "phone", label: "الجوال", type: "tel", dir: "ltr", hint: "05XXXXXXXX" }]} />
      </section>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 font-bold">البريد الإلكتروني</h2>
        <p className="mb-3 text-sm text-muted-foreground" dir="ltr">{p?.email}</p>
        <AuthForm action={saveEmail} submit="تغيير البريد" okMessage="تم تحديث البريد الإلكتروني." fields={[{ name: "email", label: "البريد الجديد", type: "email", dir: "ltr" }, { name: "currentPassword", label: "كلمة المرور الحالية", type: "password", autoComplete: "current-password" }]} />
      </section>
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 font-bold">كلمة المرور</h2>
        <AuthForm action={savePassword} submit="تغيير كلمة المرور" okMessage="تم تغيير كلمة المرور. سيُطلب منك تسجيل الدخول مجددًا على جميع الأجهزة." fields={[{ name: "currentPassword", label: "الحالية", type: "password", autoComplete: "current-password" }, { name: "newPassword", label: "الجديدة", type: "password", autoComplete: "new-password", hint: "10 أحرف على الأقل" }]} />
      </section>
      <p className="text-xs text-muted-foreground">صورة الملف الشخصي: تتطلب اعتماد مزود تخزين الوسائط (قيد الانتظار). لطلب نسخة من بياناتك أو حذفها راجع <Link href="/policies/privacy" className="underline">سياسة الخصوصية</Link> أو <Link href="/contact" className="underline">تواصل معنا</Link>.</p>
    </div>
  );
}
