import Link from "next/link";
import type { CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  PackageCheck,
  PackagePlus,
  Receipt,
  Settings,
  ShoppingBag,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatDate, formatSAR } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { adminDict } from "@/i18n/admin";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { DASHBOARD_RANGES, getDashboard } from "@/server/admin/dashboard";
import { requireStaff } from "@/server/auth/guards";

type Range = (typeof DASHBOARD_RANGES)[number];
const stg = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireStaff();
  const locale = await getLocale();
  const t = adminDict(locale);
  const D = t.dash;
  const rawRange = Number((await searchParams).range);
  const range: Range = (DASHBOARD_RANGES as readonly number[]).includes(rawRange) ? (rawRange as Range) : 30;
  const d = await getDashboard(range);

  const sar = (h: number) => formatSAR(h, locale);
  const aov = d.paidOrders ? Math.round(d.revenueHalalas / d.paidOrders) : 0;
  const prevAov = d.prevPaidOrders ? Math.round(d.prevRevenueHalalas / d.prevPaidOrders) : 0;
  const s = d.byStatus;
  const processing = (s.CONFIRMED ?? 0) + (s.PROCESSING ?? 0) + (s.READY_FOR_SHIPPING ?? 0);
  const needsReview = s.REQUIRES_RECONCILIATION ?? 0;
  const Chevron = locale === "ar" ? ChevronLeft : ChevronRight;

  const kpis: { label: string; value: string; icon: LucideIcon; tint: string; cur?: number; prev?: number; href?: string }[] = [
    { label: D.revenue, value: sar(d.revenueHalalas), icon: Banknote, tint: "bg-emerald-50 text-emerald-700 ring-emerald-100", cur: d.revenueHalalas, prev: d.prevRevenueHalalas },
    { label: D.paidOrders, value: String(d.paidOrders), icon: Receipt, tint: "bg-sky-50 text-sky-700 ring-sky-100", cur: d.paidOrders, prev: d.prevPaidOrders },
    { label: D.aov, value: sar(aov), icon: Wallet, tint: "bg-violet-50 text-violet-700 ring-violet-100", cur: aov, prev: prevAov },
    { label: D.awaitingPayment, value: String(s.PENDING ?? 0), icon: Clock, tint: "bg-amber-50 text-amber-700 ring-amber-100", href: "/admin/orders?status=PENDING" },
  ];

  const stages: { label: string; n: number; icon: LucideIcon; href: string; tone: string; bar: string }[] = [
    { label: D.stages.pending, n: s.PENDING ?? 0, icon: Clock, href: "/admin/orders?status=PENDING", tone: "bg-amber-50 text-amber-700", bar: "bg-amber-400" },
    { label: D.stages.processing, n: processing, icon: PackageCheck, href: "/admin/orders?status=CONFIRMED,PROCESSING,READY_FOR_SHIPPING", tone: "bg-sky-50 text-sky-700", bar: "bg-sky-500" },
    { label: D.stages.shipped, n: s.SHIPPED ?? 0, icon: Truck, href: "/admin/orders?status=SHIPPED", tone: "bg-violet-50 text-violet-700", bar: "bg-violet-500" },
    { label: D.stages.delivered, n: s.DELIVERED ?? 0, icon: CheckCircle2, href: "/admin/orders?status=DELIVERED", tone: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500" },
  ];
  const stageMax = Math.max(1, ...stages.map((x) => x.n));

  const quick: { label: string; href: string; icon: LucideIcon }[] = [
    { label: D.quickActions.product, href: "/admin/products", icon: PackagePlus },
    { label: D.quickActions.inventory, href: "/admin/inventory", icon: Boxes },
    { label: D.quickActions.orders, href: "/admin/orders", icon: ShoppingBag },
    { label: D.quickActions.settings, href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{D.welcome(user.fullName.split(" ")[0] ?? user.fullName)}</p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight md:text-3xl">{D.title}</h1>
        </div>
        <nav aria-label={D.rangeLabel} className="inline-flex rounded-lg border border-border bg-card p-1 shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
          {DASHBOARD_RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin?range=${r}`}
              scroll={false}
              aria-current={r === range ? "true" : undefined}
              className={cn(
                "min-h-8 rounded-md px-3 text-sm leading-8 transition-colors duration-150",
                r === range ? "bg-primary font-semibold text-white shadow-[0_1px_2px_rgb(16_24_40/0.04)]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {D.range[r]}
            </Link>
          ))}
        </nav>
      </div>

      {needsReview > 0 && (
        <div role="alert" className="fade-in flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <p className="flex-1">{D.reconcile(needsReview)}</p>
          <Link href="/admin/orders?status=REQUIRES_RECONCILIATION" className="rounded-md bg-amber-900/10 px-3 py-1.5 font-semibold transition-colors hover:bg-amber-900/20">
            {D.review}
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => {
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">{k.label}</p>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg ring-1 ring-inset sm:size-10 sm:rounded-xl", k.tint)} aria-hidden>
                  <k.icon className="size-4 sm:size-5" />
                </span>
              </div>
              <p className="tabular mt-2 truncate text-lg font-bold tracking-tight sm:text-2xl">{k.value}</p>
              {k.cur !== undefined ? <Delta cur={k.cur} prev={k.prev ?? 0} vs={D.vsPrev} none={D.noPrev} /> : <p className="mt-2 text-xs text-muted-foreground">&nbsp;</p>}
            </>
          );
          const cls = "block min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)]";
          return k.href ? (
            <Link key={k.label} href={k.href} style={stg(i)} className={cn(cls, "transition-[box-shadow,border-color] duration-150 hover:border-primary/30 hover:shadow-md")}>
              {body}
            </Link>
          ) : (
            <div key={k.label} style={stg(i)} className={cls}>
              {body}
            </div>
          );
        })}
      </div>

      {/* Chart + pipeline */}
      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section style={stg(4)} className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)] lg:col-span-2" aria-labelledby="rev-h">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <h2 id="rev-h" className="font-semibold">{D.revenueOverTime}</h2>
            <p className="tabular text-sm text-muted-foreground">{sar(d.revenueHalalas)}</p>
          </div>
          <RevenueChart
            data={d.series}
            locale={locale}
            s={{ ordersWord: locale === "ar" ? "طلب" : "orders", tableCaption: D.chartTable, day: D.day, revenue: D.revenue, empty: t.common.noData }}
          />
        </section>

        <section style={stg(5)} className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)]" aria-labelledby="pipe-h">
          <h2 id="pipe-h" className="mb-4 font-semibold">{D.pipeline}</h2>
          <ul className="space-y-1">
            {stages.map((st) => (
              <li key={st.label}>
                <Link href={st.href} className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", st.tone)} aria-hidden>
                    <st.icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{st.label}</span>
                      <span className="tabular font-semibold">{st.n}</span>
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className={cn("block h-full rounded-full transition-[width] duration-500", st.bar)} style={{ width: `${(st.n / stageMax) * 100}%` }} />
                    </span>
                  </span>
                  <Chevron className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Recent orders + stock + quick actions */}
      <div className="stagger grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section style={stg(6)} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)] lg:col-span-2" aria-labelledby="recent-h">
          <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
            <h2 id="recent-h" className="font-semibold">{D.recentOrders}</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {t.common.viewAll} <Chevron className="size-4" aria-hidden />
            </Link>
          </div>
          {d.recent.length ? (
            <ul className="divide-y divide-border">
              {d.recent.map((o, i) => (
                <li key={o.id} className={i >= 5 ? "max-sm:hidden" : undefined}>
                  <Link href={`/admin/orders/${o.id}`} className="flex flex-col gap-2 px-5 py-3 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:gap-4">
                    <span className="flex items-start justify-between gap-3 sm:block sm:min-w-32">
                      <span>
                        <span className="block font-mono text-sm font-semibold text-primary" dir="ltr">{o.reference}</span>
                        <span className="block text-xs text-muted-foreground">{formatDate(o.createdAt, true, locale)}</span>
                      </span>
                      <span className="tabular text-sm font-semibold sm:hidden">{sar(o.totalHalalas)}</span>
                    </span>
                    <span className="flex-1">
                      <StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} locale={locale} compact />
                    </span>
                    <span className="tabular hidden text-sm font-semibold sm:block">{sar(o.totalHalalas)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                <ShoppingBag className="size-6" />
              </span>
              <p className="mt-3 font-semibold">{D.noOrders}</p>
              <p className="mt-1 text-sm text-muted-foreground">{D.noOrdersHint}</p>
            </div>
          )}
        </section>

        <div className="min-w-0 space-y-4" style={stg(7)}>
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]" aria-labelledby="stock-h">
            <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
              <h2 id="stock-h" className="font-semibold">{D.lowStock}</h2>
              {d.lowStock.length > 0 && <span className="tabular rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{d.lowStock.length}</span>}
            </div>
            {d.lowStock.length ? (
              <ul className="max-h-80 divide-y divide-border overflow-y-auto">
                {d.lowStock.map((v) => (
                  <li key={v.variantId}>
                    <Link href="/admin/inventory" className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs" dir="ltr">{v.sku}</span>
                        <span className="block text-sm">{v.color} / {v.size}</span>
                      </span>
                      <span className="text-end">
                        {v.available <= 0 ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">{D.out}</span>
                        ) : (
                          <span className="tabular block text-sm font-semibold text-amber-700">{v.available} {D.available}</span>
                        )}
                        {v.reserved > 0 && <span className="tabular block text-xs text-muted-foreground">{v.reserved} {D.reserved}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-success" aria-hidden /> {D.allGood}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40/0.04)]" aria-labelledby="quick-h">
            <h2 id="quick-h" className="mb-3 font-semibold">{D.quick}</h2>
            <div className="grid grid-cols-2 gap-2">
              {quick.map((q) => (
                <Link key={q.href} href={q.href} className="flex flex-col items-start gap-2 rounded-lg border border-border p-3 text-sm font-medium transition-[border-color,background-color] duration-150 hover:border-primary/30 hover:bg-accent">
                  <q.icon className="size-[18px] text-primary" aria-hidden />
                  {q.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Delta({ cur, prev, vs, none }: { cur: number; prev: number; vs: string; none: string }) {
  if (!prev) return <p className="mt-2 text-xs text-muted-foreground">{cur ? none : " "}</p>;
  const pct = ((cur - prev) / prev) * 100;
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className="mt-2 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      <span className={cn("tabular inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold", up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
        <Icon className="size-3.5" aria-hidden />
        {up ? "+" : "−"}
        {Math.abs(pct).toFixed(Math.abs(pct) < 10 ? 1 : 0)}%
      </span>
      <span className="hidden truncate sm:inline">{vs}</span>
    </p>
  );
}
