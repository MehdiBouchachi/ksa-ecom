import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatDate } from "@saudi-ecom/contracts";
import { Users } from "lucide-react";
import { btnOutlineCls, EmptyState, inputCls, PageTitle, StatusPill, Table } from "@/components/admin/ui";
import { Forbidden } from "@/components/admin/forbidden";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listCustomers } from "@/server/admin/people";
import { adminOrNull } from "@/server/auth/guards";

const T = {
  ar: {
    title: "العملاء",
    count: (n: number) => `${n} عميل`,
    search: "ابحث بالاسم أو البريد أو الجوال",
    searchBtn: "بحث",
    cols: ["العميل", "الجوال", "الطلبات", "الحالة", "التسجيل"],
    active: "نشط",
    disabled: "معطل",
    prev: "السابق",
    next: "التالي",
    pages: "الصفحات",
    showing: (a: number, b: number, n: number) => `عرض ${a}–${b} من ${n}`,
    empty: "لا يوجد عملاء مطابقون",
    noneTitle: "لا يوجد عملاء بعد",
    noneBody: "يظهر العملاء هنا عند إنشاء حساب في المتجر. تُعرض فقط البيانات اللازمة لدعم الطلبات.",
  },
  en: {
    title: "Customers",
    count: (n: number) => `${n} customer${n === 1 ? "" : "s"}`,
    search: "Search by name, email or phone",
    searchBtn: "Search",
    cols: ["Customer", "Phone", "Orders", "Status", "Joined"],
    active: "Active",
    disabled: "Disabled",
    prev: "Previous",
    next: "Next",
    pages: "Pages",
    showing: (a: number, b: number, n: number) => `Showing ${a}–${b} of ${n}`,
    empty: "No matching customers",
    noneTitle: "No customers yet",
    noneBody: "Customers appear here once they create a store account. Only the data needed to support orders is shown.",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

/** ADMIN ONLY. A Manager hitting this URL gets the Forbidden view. */
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await adminOrNull();
  if (!user) return <Forbidden />;
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const r = await listCustomers(user, { q: sp.q, page });
  const href = (p: number) => `?page=${p}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`;
  const from = r.total ? (page - 1) * r.pageSize + 1 : 0;
  const to = Math.min(page * r.pageSize, r.total);
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const disabled = cn(btnOutlineCls, "pointer-events-none opacity-40");
  return (
    <>
      <PageTitle description={t.count(r.total)}>{t.title}</PageTitle>
      {!sp.q && r.total === 0 ? (
        <EmptyState icon={Users} title={t.noneTitle}>{t.noneBody}</EmptyState>
      ) : (
      <>
      <form method="get" role="search" className="mb-4 flex max-w-xl gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">{t.searchBtn}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input name="q" type="search" defaultValue={sp.q} placeholder={t.search} className={cn(inputCls, "ps-9")} />
        </label>
        <button className={btnOutlineCls}>{t.searchBtn}</button>
      </form>
      <Table head={t.cols} empty={!r.items.length} emptyText={t.empty}>
        {r.items.map((c) => (
          <tr key={c.id}>
            <td>
              <Link href={`/admin/customers/${c.id}`} className="group flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-primary" aria-hidden>{c.fullName.trim().slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block font-medium text-primary group-hover:underline">{c.fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground" dir="ltr">{c.email}</span>
                </span>
              </Link>
            </td>
            <td dir="ltr" className="text-start font-mono text-xs">{c.phone ?? "—"}</td>
            <td className="tabular">{c.orders}</td>
            <td><StatusPill on={c.status === "ACTIVE"} labels={[t.active, t.disabled]} /></td>
            <td className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(c.createdAt, false, locale)}</td>
          </tr>
        ))}
      </Table>
      {r.total > 0 && (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm" aria-label={t.pages}>
          <span className="tabular text-muted-foreground">{t.showing(from, to, r.total)}</span>
          <span className="flex gap-2">
            {page > 1 ? <Link href={href(page - 1)} className={btnOutlineCls}><Prev className="size-4" aria-hidden />{t.prev}</Link> : <span className={disabled} aria-disabled><Prev className="size-4" aria-hidden />{t.prev}</span>}
            {to < r.total ? <Link href={href(page + 1)} className={btnOutlineCls}>{t.next}<Next className="size-4" aria-hidden /></Link> : <span className={disabled} aria-disabled>{t.next}<Next className="size-4" aria-hidden /></span>}
          </span>
        </nav>
      )}
      </>
      )}
    </>
  );
}
