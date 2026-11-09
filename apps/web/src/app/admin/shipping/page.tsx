import Link from "next/link";
import { PackageCheck, RefreshCw, Settings2, Truck } from "lucide-react";
import { formatDate, type ShipmentStatus } from "@saudi-ecom/contracts";
import { btnCls, btnOutlineCls, Field, Flash, inputCls, PageTitle, Section, Table } from "@/components/admin/ui";
import { statusLabels } from "@/i18n/admin";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { requireStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { listShipments, listShippableOrders } from "@/server/shipping/service";
import { createShipmentAction, refreshShipmentAction, saveOperationalSettingsAction } from "../actions";

const T = {
  ar: {
    title: "الشحن",
    desc: "أرامكس — إنشاء البوالص وتتبع الشحنات.",
    rates: "جدول الشحن",
    ratesHint: "يحدده التاجر. إذا لم يُحدد سعر الشحن يتوقف إتمام الطلب برسالة واضحة (لا توجد أسعار مخترعة).",
    flat: "سعر الشحن الثابت (ر.س)",
    free: "شحن مجاني من (ر.س)",
    optional: "اختياري",
    low: "حد تنبيه المخزون",
    save: "حفظ",
    ready: "طلبات مدفوعة جاهزة للشحن",
    readyCols: ["الطلب", "المدينة", "التاريخ", ""],
    create: "إنشاء بوليصة",
    noneReady: "لا توجد طلبات بانتظار الشحن",
    shipments: "الشحنات",
    cols: ["الطلب", "AWB", "الحالة", "آخر مزامنة", ""],
    error: "خطأ",
    refresh: "تحديث",
  },
  en: {
    title: "Shipping",
    desc: "Aramex — create waybills and track shipments.",
    rates: "Shipping rates",
    ratesHint: "Set by the merchant. If no rate is set, checkout stops with a clear message (no invented prices).",
    flat: "Flat shipping rate (SAR)",
    free: "Free shipping from (SAR)",
    optional: "Optional",
    low: "Low-stock alert threshold",
    save: "Save",
    ready: "Paid orders ready to ship",
    readyCols: ["Order", "City", "Date", ""],
    create: "Create waybill",
    noneReady: "No orders waiting to ship",
    shipments: "Shipments",
    cols: ["Order", "AWB", "Status", "Last sync", ""],
    error: "Error",
    refresh: "Refresh",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

export default async function Shipping({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const L = statusLabels(locale);
  const [ready, shipments, commerce] = await Promise.all([listShippableOrders(), listShipments(), getSetting("commerce")]);
  const sar = (h: number | null) => (h === null ? "" : (h / 100).toFixed(2));
  const shipTone = (s: string) => (s === "DELIVERED" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : s === "FAILED" || s === "RETURNED" ? "bg-red-50 text-red-700 ring-red-200" : s === "NOT_CREATED" ? "bg-stone-50 text-stone-600 ring-stone-200" : "bg-sky-50 text-sky-800 ring-sky-200");

  return (
    <>
      <PageTitle description={t.desc}>{t.title}</PageTitle>
      <Flash sp={await searchParams} />

      <Section className="mb-6" title={<span className="flex items-center gap-2"><Settings2 className="size-4 text-primary" aria-hidden /> {t.rates}</span>}>
        <form action={saveOperationalSettingsAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t.flat}><input name="shippingFlat" inputMode="decimal" dir="ltr" placeholder="0.00" defaultValue={sar(commerce.shippingFlatHalalas)} className={inputCls} /></Field>
          <Field label={t.free} hint={t.optional}><input name="freeThreshold" inputMode="decimal" dir="ltr" placeholder="0.00" defaultValue={sar(commerce.freeShippingThresholdHalalas)} className={inputCls} /></Field>
          <Field label={t.low}><input name="lowStockThreshold" type="number" min={0} defaultValue={commerce.lowStockThreshold} className={inputCls} /></Field>
          <div className="sm:pt-[1.625rem]"><button className={cn(btnCls, "w-full")}>{t.save}</button></div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">{t.ratesHint}</p>
      </Section>

      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <PackageCheck className="size-5 text-primary" aria-hidden /> {t.ready}
        {ready.length > 0 && <span className="tabular rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{ready.length}</span>}
      </h2>
      <Table head={t.readyCols} empty={!ready.length} emptyText={t.noneReady}>
        {ready.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-primary hover:underline" dir="ltr">{o.reference}</Link></td>
            <td>{o.city}</td>
            <td className="text-muted-foreground">{formatDate(o.createdAt, false, locale)}</td>
            <td className="text-end">
              <form action={createShipmentAction}>
                <input type="hidden" name="orderId" value={o.id} />
                <input type="hidden" name="back" value="/admin/shipping" />
                <button className={cn(btnCls, "min-h-9")}><Truck className="size-4" aria-hidden /> {t.create}</button>
              </form>
            </td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold"><Truck className="size-5 text-primary" aria-hidden /> {t.shipments}</h2>
      <Table head={t.cols} empty={!shipments.length}>
        {shipments.map((s) => (
          <tr key={s.id}>
            <td><Link href={`/admin/orders/${s.orderId}`} className="font-mono font-semibold text-primary hover:underline" dir="ltr">{s.reference}</Link></td>
            <td className="font-mono text-xs" dir="ltr">{s.awb ?? (s.createState === "ERROR" ? <span className="text-destructive">{t.error}</span> : "…")}</td>
            <td>
              <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", shipTone(s.status))}>{L.shipping[s.status as ShipmentStatus] ?? s.status}</span>
              {s.lastError ? <span className="mt-1 block text-xs text-destructive">{s.lastError}</span> : null}
            </td>
            <td className="text-xs text-muted-foreground">{s.lastSyncedAt ? formatDate(s.lastSyncedAt, true, locale) : "—"}</td>
            <td className="text-end">
              {s.awb && (
                <form action={refreshShipmentAction}>
                  <input type="hidden" name="shipmentId" value={s.id} />
                  <input type="hidden" name="back" value="/admin/shipping" />
                  <button className={cn(btnOutlineCls, "min-h-9")}><RefreshCw className="size-4" aria-hidden /> {t.refresh}</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
