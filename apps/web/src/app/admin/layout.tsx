import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/(auth)/auth/actions";
import { getCurrentUser, isStaff } from "@/server/auth/guards";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "لوحة التحكم", template: "%s | لوحة التحكم" }, robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "الرئيسية" },
  { href: "/admin/orders", label: "الطلبات" },
  { href: "/admin/products", label: "المنتجات" },
  { href: "/admin/variants", label: "الألوان والمقاسات" },
  { href: "/admin/pricing", label: "أسعار الجملة" },
  { href: "/admin/inventory", label: "المخزون" },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/brands", label: "العلامات" },
  { href: "/admin/collections", label: "المجموعات" },
  { href: "/admin/shipping", label: "الشحن" },
  { href: "/admin/settings", label: "الإعدادات والمحتوى" },
];
const ADMIN_ONLY = [
  { href: "/admin/customers", label: "العملاء" },
  { href: "/admin/team", label: "فريق العمل" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/admin");
  if (!isStaff(user)) redirect("/");
  const nav = user.role === "ADMIN" ? [...NAV, ...ADMIN_ONLY] : NAV; // hidden for Managers; also enforced server-side
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-border bg-card md:min-h-dvh md:border-b-0 md:border-e">
        <div className="flex items-center justify-between p-4">
          <Link href="/admin" className="font-bold text-primary">لوحة التحكم</Link>
          <Link href="/" className="text-xs text-muted-foreground">المتجر</Link>
        </div>
        <nav aria-label="لوحة التحكم" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-muted">{n.label}</Link>
          ))}
        </nav>
        <div className="hidden border-t border-border p-4 text-xs text-muted-foreground md:block">
          <p>{user.fullName}</p>
          <p>{user.role === "ADMIN" ? "مدير عام" : "مدير عمليات"}</p>
          <form action={logoutAction}><button className="mt-2 text-destructive">تسجيل الخروج</button></form>
        </div>
      </aside>
      <main id="main" className="min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}
