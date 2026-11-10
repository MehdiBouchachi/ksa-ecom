import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { formatDate, formatSAR } from "@saudi-ecom/contracts";
import { OrderStatusSummary } from "@/components/admin/order-status-summary";
import { btnOutlineCls, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { adminDict, statusLabels } from "@/i18n/admin";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/guards";
import { listOrdersAdmin } from "@/server/orders/queries";

const PAYMENTS = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export async function generateMetadata() {
  return { title: adminDict(await getLocale()).orders.title };
}

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; payment?: string; q?: string; sort?: string; page?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = adminDict(locale).orders;
  const L = statusLabels(locale);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const sort = (["newest", "oldest", "total_desc", "total_asc"] as const).find((value) => value === sp.sort) ?? "newest";
  const r = await listOrdersAdmin({ status: sp.status, payment: sp.payment, q: sp.q, sort, page });

  const href = (o: { page?: number; status?: string | null; keepFilters?: boolean }) => {
    const status = o.status === undefined ? sp.status : o.status;
    const keep = o.keepFilters ?? true;
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (keep && sp.payment) p.set("payment", sp.payment);
    if (keep && sp.q) p.set("q", sp.q);
    if (sort !== "newest") p.set("sort", sort);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  if (r.total > 0 && (page - 1) * r.pageSize >= r.total) redirect(href({ page: Math.ceil(r.total / r.pageSize) }));

  const tabs: { label: string; status: string | null }[] = [
    { label: t.all, status: null },
    { label: L.order.PENDING, status: "PENDING" },
    { label: t.processingGroup, status: "CONFIRMED,PROCESSING,READY_FOR_SHIPPING" },
    { label: L.order.SHIPPED, status: "SHIPPED" },
    { label: L.order.DELIVERED, status: "DELIVERED" },
    { label: L.order.REQUIRES_RECONCILIATION, status: "REQUIRES_RECONCILIATION" },
    { label: L.order.CANCELLED, status: "CANCELLED" },
    { label: L.order.RETURNED, status: "RETURNED" },
  ];
  const from = r.total ? (page - 1) * r.pageSize + 1 : 0;
  const to = Math.min(page * r.pageSize, r.total);
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const disabled = cn(btnOutlineCls, "pointer-events-none opacity-40");

  return (
    <>
      <PageTitle description={t.count(r.total)}>{t.title}</PageTitle>

      <nav aria-label={L.prefix.order} className="mb-5 flex flex-wrap gap-x-1 border-b border-border">
        {tabs.map((tab) => {
          const active = (sp.status ?? null) === tab.status;
          return (
            <Link
              key={tab.label}
              href={href({ status: tab.status })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-10 items-center whitespace-nowrap border-b-2 px-3 text-sm transition-colors duration-150",
                active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <form className="mb-4 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-3" method="get" role="search" action="/admin/orders">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <label className="relative min-w-0 basis-full sm:basis-60 sm:flex-1">
          <span className="sr-only">{t.searchLabel}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input name="q" type="search" defaultValue={sp.q} placeholder={t.search} className={cn(inputCls, "ps-9")} />
        </label>
        <label className="w-full sm:w-52">
          <span className="sr-only">{t.paymentLabel}</span>
          <select name="payment" defaultValue={sp.payment ?? ""} className={inputCls}>
            <option value="">{t.allPayments}</option>
            {PAYMENTS.map((p) => (
              <option key={p} value={p}>{L.payment[p]}</option>
            ))}
          </select>
        </label>
        <label className="w-full sm:w-44">
          <span className="sr-only">{t.sortLabel}</span>
          <select name="sort" defaultValue={sort} className={inputCls}>
            {Object.entries(t.sort).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className={cn(btnOutlineCls, "flex-1 sm:flex-none")}>{t.filter}</button>
        {(sp.q || sp.payment) && (
          <Link href={href({ keepFilters: false })} className={btnOutlineCls}>
            <X className="size-4" aria-hidden />
            {t.clear}
          </Link>
        )}
      </form>

      {/* Mobile: stacked cards (no sideways scrolling) */}
      <ul className="space-y-2 lg:hidden">
        {r.items.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-primary active:bg-muted">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-mono font-semibold text-primary" dir="ltr">{o.reference}</span>
                  <span className="block break-words text-sm">{o.customerName}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5"><span className="tabular font-semibold">{formatSAR(o.totalHalalas, locale)}</span><Next className="size-4 text-muted-foreground" aria-hidden /></span>
              </span>
              <span className="mt-2 block">
                <OrderStatusSummary order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} locale={locale} />
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">{formatDate(o.createdAt, true, locale)}</span>
            </Link>
          </li>
        ))}
        {!r.items.length && <li className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t.empty}</li>}
      </ul>

      <Table className="hidden lg:block" caption={t.title} head={[t.cols.ref, t.cols.customer, t.cols.status, <span key="t" className="block text-end">{t.cols.total}</span>, <span key="a" className="sr-only">{t.view}</span>]} empty={!r.items.length} emptyText={t.empty}>
        {r.items.map((o) => (
          <tr key={o.id}>
            <td>
              <span className="block font-mono font-semibold text-foreground" dir="ltr">{o.reference}</span>
              <span className="block text-xs text-muted-foreground">{formatDate(o.createdAt, true, locale)}</span>
            </td>
            <td className="max-w-56 whitespace-normal font-medium">{o.customerName}</td>
            <td>
              <OrderStatusSummary order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} locale={locale} />
            </td>
            <td className="tabular whitespace-nowrap text-end font-semibold">{formatSAR(o.totalHalalas, locale)}</td>
            <td className="text-end">
              <Link href={`/admin/orders/${o.id}`} className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-md border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-primary" aria-label={`${t.view} ${o.reference}`}>
                {t.view}<Next className="size-3.5" aria-hidden />
              </Link>
            </td>
          </tr>
        ))}
      </Table>

      {r.total > 0 && (
        <nav className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm" aria-label={t.pages}>
          <span className="tabular text-muted-foreground">{t.showing(from, to, r.total)}</span>
          <span className="flex gap-2">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className={btnOutlineCls}>
                <Prev className="size-4" aria-hidden />
                {t.prev}
              </Link>
            ) : (
              <span className={disabled} aria-disabled>
                <Prev className="size-4" aria-hidden />
                {t.prev}
              </span>
            )}
            {to < r.total ? (
              <Link href={href({ page: page + 1 })} className={btnOutlineCls}>
                {t.next}
                <Next className="size-4" aria-hidden />
              </Link>
            ) : (
              <span className={disabled} aria-disabled>
                {t.next}
                <Next className="size-4" aria-hidden />
              </span>
            )}
          </span>
        </nav>
      )}
    </>
  );
}
