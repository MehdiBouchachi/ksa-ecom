import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { formatDate, formatSAR } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { btnCls, btnOutlineCls, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { adminDict, statusLabels } from "@/i18n/admin";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/guards";
import { listOrdersAdmin } from "@/server/orders/queries";

const PAYMENTS = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

export async function generateMetadata() {
  return { title: adminDict(await getLocale()).orders.title };
}

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; payment?: string; q?: string; page?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = adminDict(locale).orders;
  const L = statusLabels(locale);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const r = await listOrdersAdmin({ status: sp.status, payment: sp.payment, q: sp.q, page });

  const href = (o: { page?: number; status?: string | null; keepFilters?: boolean }) => {
    const status = o.status === undefined ? sp.status : o.status;
    const keep = o.keepFilters ?? true;
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (keep && sp.payment) p.set("payment", sp.payment);
    if (keep && sp.q) p.set("q", sp.q);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

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

      <nav aria-label={L.prefix.order} className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((tab) => {
          const active = (sp.status ?? null) === tab.status;
          return (
            <Link
              key={tab.label}
              href={href({ status: tab.status })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-150",
                active ? "border-primary bg-primary font-medium text-white" : "border-border bg-card text-foreground/80 hover:border-stone-300 hover:bg-muted",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <form className="mb-4 flex flex-wrap gap-2" method="get" role="search" action="/admin/orders">
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
        <button className={cn(btnCls, "flex-1 sm:flex-none")}>{t.filter}</button>
        {(sp.q || sp.payment) && (
          <Link href={href({ keepFilters: false })} className={btnOutlineCls}>
            <X className="size-4" aria-hidden />
            {t.clear}
          </Link>
        )}
      </form>

      {/* Mobile: stacked cards (no sideways scrolling) */}
      <ul className="space-y-2 md:hidden">
        {r.items.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className="block rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-colors active:bg-muted">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-mono font-semibold text-primary" dir="ltr">{o.reference}</span>
                  <span className="block truncate text-sm">{o.customerName}</span>
                </span>
                <span className="tabular shrink-0 font-semibold">{formatSAR(o.totalHalalas, locale)}</span>
              </span>
              <span className="mt-2 block">
                <StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} locale={locale} compact />
              </span>
              <span className="mt-2 block text-xs text-muted-foreground">{formatDate(o.createdAt, true, locale)}</span>
            </Link>
          </li>
        ))}
        {!r.items.length && <li className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t.empty}</li>}
      </ul>

      <Table className="hidden md:block" head={[t.cols.ref, t.cols.customer, t.cols.status, <span key="t" className="block text-end">{t.cols.total}</span>]} empty={!r.items.length} emptyText={t.empty}>
        {r.items.map((o) => (
          <tr key={o.id}>
            <td>
              <Link href={`/admin/orders/${o.id}`} className="block font-mono font-semibold text-primary hover:underline" dir="ltr">
                {o.reference}
              </Link>
              <span className="block text-xs text-muted-foreground">{formatDate(o.createdAt, true, locale)}</span>
            </td>
            <td className="max-w-48 truncate">{o.customerName}</td>
            <td>
              <StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} locale={locale} compact />
            </td>
            <td className="tabular whitespace-nowrap text-end font-semibold">{formatSAR(o.totalHalalas, locale)}</td>
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
