import { redirect } from "next/navigation";
import { AdminShell, type NavGroup } from "@/components/admin/shell";
import { adminDict } from "@/i18n/admin";
import { getLocale } from "@/i18n/locale";
import { getCurrentUser, isStaff } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = adminDict(await getLocale());
  return { title: { default: t.brand, template: `%s | ${t.brand}` }, robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/admin");
  if (!isStaff(user)) redirect("/");
  const locale = await getLocale();
  const t = adminDict(locale);
  const n = t.nav;

  const groups: NavGroup[] = [
    { label: t.groups.overview, items: [{ key: "dashboard", href: "/admin", label: n.dashboard }] },
    { label: t.groups.sales, items: [{ key: "orders", href: "/admin/orders", label: n.orders }, { key: "shipping", href: "/admin/shipping", label: n.shipping }] },
    {
      label: t.groups.catalog,
      items: [
        { key: "products", href: "/admin/products", label: n.products },
        { key: "variants", href: "/admin/variants", label: n.variants },
        { key: "pricing", href: "/admin/pricing", label: n.pricing },
        { key: "inventory", href: "/admin/inventory", label: n.inventory },
        { key: "categories", href: "/admin/categories", label: n.categories },
        { key: "brands", href: "/admin/brands", label: n.brands },
        { key: "collections", href: "/admin/collections", label: n.collections },
      ],
    },
    { label: t.groups.store, items: [{ key: "settings", href: "/admin/settings", label: n.settings }] },
  ];
  // Hidden for Managers (also enforced server-side on every page/action).
  if (user.role === "ADMIN") {
    groups.push({ label: t.groups.people, items: [{ key: "customers", href: "/admin/customers", label: n.customers }, { key: "team", href: "/admin/team", label: n.team }] });
  }

  return (
    <AdminShell
      locale={locale}
      groups={groups}
      user={{ name: user.fullName, role: t.roles[user.role as keyof typeof t.roles] ?? user.role }}
      s={{ brand: t.brand, viewStore: t.viewStore, openMenu: t.openMenu, closeMenu: t.closeMenu, language: t.language, languageLabel: t.languageLabel, signOut: t.signOut }}
    >
      {children}
    </AdminShell>
  );
}
