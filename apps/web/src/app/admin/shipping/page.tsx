import Link from "next/link";
import { PackageCheck, RefreshCw, Truck } from "lucide-react";
import { formatDate, formatSAR, type ShipmentStatus } from "@saudi-ecom/contracts";
import { SubmitButton } from "@/components/admin/overlay";
import { AdminPageHeader, btnCls, btnOutlineCls, Callout, EmptyState, Field, Flash, FormSection, inputCls, Section, StatusBadge, TabNav, Table, type Tone } from "@/components/admin/ui";
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
    desc: "تجهيز الطلبات المدفوعة وإنشاء بوالص أرامكس وتتبعها.",
    tabs: "أقسام الشحن",
    queue: "بانتظار الشحن",
    history: "الشحنات",
    settings: "الإعدادات",
    queueDesc: "طلبات مدفوعة ومؤكدة لم تُنشأ لها بوليصة بعد، الأقدم أولًا.",
    queueCols: ["الطلب", "العميل", "المدينة", "تاريخ الدفع", "الحالة", ""],
    create: "إنشاء بوليصة",
    retry: "إعادة المحاولة",
    creating: "جارٍ الإنشاء…",
    failed: "فشلت المحاولة السابقة",
    pending: "محاولة سابقة لم تكتمل",
    ready: "جاهز",
    noneReady: "لا توجد طلبات بانتظار الشحن",
    noneReadyBody: "تظهر هنا الطلبات بعد تأكيد الدفع.",
    toOrders: "عرض الطلبات",
    historyDesc: "آخر 100 شحنة. «تحديث» يجلب حالة التتبع من أرامكس.",
    cols: ["الطلب", "رقم البوليصة (AWB)", "حالة الشحن", "آخر مزامنة", ""],
    refresh: "تحديث التتبع",
    refreshing: "جارٍ التحديث…",
    noShipments: "لا توجد شحنات بعد",
    error: "خطأ في الإنشاء",
    noAwb: "بانتظار الرقم",
    never: "لم تتم",
    rates: "أسعار الشحن",
    ratesDesc: "يحددها التاجر. إذا لم يُحدَّد سعر الشحن يتوقف إتمام الطلب برسالة واضحة — لا توجد أسعار افتراضية.",
    flat: "سعر الشحن الثابت (ر.س)",
    free: "شحن مجاني للطلبات من (ر.س)",
    freeHint: "اختياري. اتركه فارغًا لعدم تقديم شحن مجاني.",
    alerts: "تنبيه المخزون",
    alertsDesc: "يُعلَّم الخيار «منخفض» عندما يصل المتاح إلى هذا الرقم أو أقل.",
    low: "حد المخزون المنخفض",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    current: (flat: string, free: string | null) => `الحالي: ${flat}${free ? ` · مجاني من ${free}` : ""}`,
    notSet: "سعر الشحن غير محدد — إتمام الطلب متوقف حتى يُحدَّد.",
    integration: "أرامكس يعمل في وضع الاختبار حتى تُعتمد بيانات حساب التاجر. لا تظهر هنا أي نتائج مصطنعة.",
  },
  en: {
    title: "Shipping",
    desc: "Fulfil paid orders, create Aramex waybills and track them.",
    tabs: "Shipping sections",
    queue: "To ship",
    history: "Shipments",
    settings: "Settings",
    queueDesc: "Paid, confirmed orders without a waybill yet, oldest first.",
    queueCols: ["Order", "Customer", "City", "Paid", "State", ""],
    create: "Create waybill",
    retry: "Retry",
    creating: "Creating…",
    failed: "Previous attempt failed",
    pending: "Previous attempt incomplete",
    ready: "Ready",
    noneReady: "No orders waiting to ship",
    noneReadyBody: "Orders appear here once their payment is confirmed.",
    toOrders: "View orders",
    historyDesc: "Latest 100 shipments. “Refresh tracking” fetches the status from Aramex.",
    cols: ["Order", "Waybill (AWB)", "Shipping status", "Last sync", ""],
    refresh: "Refresh tracking",
    refreshing: "Refreshing…",
    noShipments: "No shipments yet",
    error: "Creation error",
    noAwb: "Awaiting number",
    never: "Never",
    rates: "Shipping rates",
    ratesDesc: "Set by the merchant. If no rate is set, checkout stops with a clear message — there are no default prices.",
    flat: "Flat shipping rate (SAR)",
    free: "Free shipping for orders from (SAR)",
    freeHint: "Optional. Leave empty to not offer free shipping.",
    alerts: "Stock alert",
    alertsDesc: "A variant is marked “low” when its available stock reaches this number or less.",
    low: "Low-stock threshold",
    save: "Save changes",
    saving: "Saving…",
    current: (flat: string, free: string | null) => `Current: ${flat}${free ? ` · free from ${free}` : ""}`,
    notSet: "No shipping rate set — checkout is blocked until one is set.",
    integration: "Aramex runs in sandbox mode until the merchant's account details are approved. Nothing shown here is simulated as real.",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

const shipTone = (s: string): Tone => (s === "DELIVERED" ? "success" : s === "FAILED" || s === "RETURNED" ? "danger" : s === "NOT_CREATED" ? "neutral" : "info");

export default async function Shipping({ searchParams }: { searchParams: Promise<{ tab?: string; ok?: string; error?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const L = statusLabels(locale);
  const sp = await searchParams;
  const tab = sp.tab === "history" || sp.tab === "settings" ? sp.tab : "queue";
  const [ready, shipments, commerce] = await Promise.all([listShippableOrders(), listShipments(), getSetting("commerce")]);
  const sar = (h: number | null) => (h === null ? "" : (h / 100).toFixed(2));
  const href = (k: string) => (k === "queue" ? "/admin/shipping" : `/admin/shipping?tab=${k}`);

  return (
    <>
      <AdminPageHeader title={t.title} description={t.desc} />
      <Flash sp={sp} />
      <TabNav
        label={t.tabs}
        items={[
          { href: href("queue"), label: t.queue, active: tab === "queue", count: ready.length, tone: "warning" },
          { href: href("history"), label: t.history, active: tab === "history", count: shipments.length },
          { href: href("settings"), label: t.settings, active: tab === "settings" },
        ]}
      />
      {commerce.shippingFlatHalalas === null && tab !== "settings" && (
        <Callout tone="warning" className="mb-4">
          {t.notSet} <Link href={href("settings")} className="font-medium underline">{t.settings}</Link>
        </Callout>
      )}

      {tab === "queue" &&
        (ready.length === 0 ? (
          <EmptyState icon={PackageCheck} title={t.noneReady} action={<Link href="/admin/orders" className={btnOutlineCls}>{t.toOrders}</Link>}>{t.noneReadyBody}</EmptyState>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{t.queueDesc}</p>
            <Table head={t.queueCols} caption={t.queue}>
              {ready.map((o) => {
                const failed = o.shipmentState === "ERROR";
                const retry = failed || o.shipmentState === "PENDING";
                return (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-primary hover:underline" dir="ltr">{o.reference}</Link></td>
                    <td className="max-w-48 truncate">{o.customer}</td>
                    <td>{o.city}</td>
                    <td className="whitespace-nowrap text-muted-foreground">{formatDate(o.paidAt ?? o.createdAt, false, locale)}</td>
                    <td>
                      {failed ? <StatusBadge tone="danger">{t.failed}</StatusBadge> : retry ? <StatusBadge tone="warning">{t.pending}</StatusBadge> : <StatusBadge tone="primary">{t.ready}</StatusBadge>}
                      {o.shipmentError && <span className="mt-1 block max-w-64 text-xs text-destructive">{o.shipmentError}</span>}
                    </td>
                    <td className="w-px text-end">
                      <form action={createShipmentAction}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <input type="hidden" name="back" value="/admin/shipping" />
                        <SubmitButton className={cn(btnOutlineCls, "min-h-9", !retry && "text-primary")} pendingLabel={t.creating}>
                          {retry ? <RefreshCw className="size-4" aria-hidden /> : <Truck className="size-4" aria-hidden />} {retry ? t.retry : t.create}
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </>
        ))}

      {tab === "history" &&
        (shipments.length === 0 ? (
          <EmptyState icon={Truck} title={t.noShipments} />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">{t.historyDesc}</p>
            <Table head={t.cols} caption={t.history}>
              {shipments.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/admin/orders/${s.orderId}`} className="font-mono font-semibold text-primary hover:underline" dir="ltr">{s.reference}</Link></td>
                  <td className="font-mono text-xs" dir="ltr">{s.awb ?? <span className={s.createState === "ERROR" ? "text-destructive" : "text-muted-foreground"}>{s.createState === "ERROR" ? t.error : t.noAwb}</span>}</td>
                  <td>
                    <StatusBadge tone={shipTone(s.status)}>{L.shipping[s.status as ShipmentStatus] ?? s.status}</StatusBadge>
                    {s.lastError ? <span className="mt-1 block max-w-64 text-xs text-destructive">{s.lastError}</span> : null}
                  </td>
                  <td className="whitespace-nowrap text-xs text-muted-foreground">{s.lastSyncedAt ? formatDate(s.lastSyncedAt, true, locale) : t.never}</td>
                  <td className="w-px text-end">
                    {s.awb && (
                      <form action={refreshShipmentAction}>
                        <input type="hidden" name="shipmentId" value={s.id} />
                        <input type="hidden" name="back" value={href("history")} />
                        <SubmitButton className={cn(btnOutlineCls, "min-h-9")} pendingLabel={t.refreshing}><RefreshCw className="size-4" aria-hidden /> {t.refresh}</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </>
        ))}

      {tab === "settings" && (
        <div className="max-w-3xl space-y-5">
          <Section>
            <form action={saveOperationalSettingsAction} className="space-y-6">
              <input type="hidden" name="back" value={href("settings")} />
              <FormSection
                title={t.rates}
                description={
                  <>
                    {t.ratesDesc}
                    {commerce.shippingFlatHalalas !== null && (
                      <span className="mt-1 block">{t.current(formatSAR(commerce.shippingFlatHalalas, locale), commerce.freeShippingThresholdHalalas !== null ? formatSAR(commerce.freeShippingThresholdHalalas, locale) : null)}</span>
                    )}
                  </>
                }
              >
                <Field label={t.flat}><input name="shippingFlat" inputMode="decimal" pattern="\d+(\.\d{1,2})?" dir="ltr" placeholder="0.00" defaultValue={sar(commerce.shippingFlatHalalas)} className={inputCls} /></Field>
                <Field label={t.free} hint={t.freeHint}><input name="freeThreshold" inputMode="decimal" pattern="\d+(\.\d{1,2})?" dir="ltr" placeholder="0.00" defaultValue={sar(commerce.freeShippingThresholdHalalas)} className={inputCls} /></Field>
              </FormSection>
              <FormSection title={t.alerts} description={t.alertsDesc}>
                <Field label={t.low}><input name="lowStockThreshold" type="number" min={0} step={1} dir="ltr" defaultValue={commerce.lowStockThreshold} className={inputCls} /></Field>
              </FormSection>
              <div className="flex justify-end border-t border-border pt-4">
                <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
              </div>
            </form>
          </Section>
          <Callout>{t.integration}</Callout>
        </div>
      )}
    </>
  );
}
