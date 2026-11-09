import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, CreditCard, MapPin, Package, RefreshCw, Settings2, Truck, History } from "lucide-react";
import { canTransition, formatDate, formatSAR, ORDER_TRANSITIONS, type OrderStatus, type ShipmentStatus } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { btnCls, btnOutlineCls, ConfirmBox, Flash, inputCls, Table } from "@/components/admin/ui";
import { statusLabels } from "@/i18n/admin";
import { getLocale } from "@/i18n/locale";
import { requireStaff } from "@/server/auth/guards";
import { getOrderAdmin } from "@/server/orders/queries";
import { createShipmentAction, orderCancelAction, orderStatusAction, refreshShipmentAction } from "../../actions";

const T = {
  ar: {
    title: "تفاصيل الطلب",
    back: "الطلبات",
    order: "طلب",
    review: "تم استلام دفع متأخر أو غير مطابق. راجع المخزون والدفع: خصص الكمية يدويًا ثم أكد الطلب (مدير عام)، أو ألغِ الطلب وقم بالاسترداد من لوحة مزود الدفع.",
    items: "المنتجات (لقطة وقت الطلب)",
    cols: ["SKU", "المنتج", "النوع", "الكمية", "سعر القطعة", "الإجمالي"],
    mode: { RETAIL: "تجزئة", BULK: "جملة" },
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    tax: "الضريبة",
    included: "(مشمولة)",
    total: "الإجمالي",
    delivery: "بيانات التوصيل",
    deliveryNote: "لهذا الطلب فقط",
    building: "مبنى",
    payment: "الدفع",
    noAttempts: "لا توجد محاولات دفع.",
    paidAt: "تاريخ الدفع المتحقق",
    aramex: "الشحن (أرامكس)",
    status: "الحالة",
    lastError: "آخر خطأ",
    refresh: "تحديث التتبع",
    noShipment: "لم تُنشأ شحنة بعد.",
    retryShipment: "إعادة محاولة إنشاء الشحنة",
    createShipment: "إنشاء شحنة أرامكس",
    actions: "الإجراءات",
    changeStatus: "تغيير حالة الطلب",
    note: "ملاحظة (اختياري)",
    update: "تحديث الحالة",
    noActions: "لا توجد إجراءات متاحة لهذه الحالة.",
    cancel: "إلغاء الطلب",
    reason: "سبب الإلغاء",
    restock: "إعادة الكمية للمخزون (مرة واحدة)",
    refundNote: "الاسترداد المالي يتم عبر لوحة مزود الدفع ويسجَّل في سجل التدقيق.",
    confirm: (r: string) => `أؤكد إلغاء الطلب ${r}`,
    confirmCancel: "تأكيد الإلغاء",
    timeline: "السجل الزمني",
    streams: { ORDER: "الطلب", PAYMENT: "الدفع", SHIPPING: "الشحن" } as Record<string, string>,
    carrier: "أرامكس",
  },
  en: {
    title: "Order details",
    back: "Orders",
    order: "Order",
    review: "A late or mismatched payment was received. Check stock and payment: allocate quantity manually then confirm the order (administrator), or cancel and refund from the payment provider dashboard.",
    items: "Items (snapshot at order time)",
    cols: ["SKU", "Product", "Type", "Qty", "Unit price", "Total"],
    mode: { RETAIL: "Retail", BULK: "Wholesale" },
    subtotal: "Subtotal",
    shipping: "Shipping",
    tax: "VAT",
    included: "(included)",
    total: "Total",
    delivery: "Delivery details",
    deliveryNote: "for this order only",
    building: "Building",
    payment: "Payment",
    noAttempts: "No payment attempts.",
    paidAt: "Verified payment date",
    aramex: "Shipping (Aramex)",
    status: "Status",
    lastError: "Last error",
    refresh: "Refresh tracking",
    noShipment: "No shipment created yet.",
    retryShipment: "Retry shipment creation",
    createShipment: "Create Aramex shipment",
    actions: "Actions",
    changeStatus: "Change order status",
    note: "Note (optional)",
    update: "Update status",
    noActions: "No actions available for this status.",
    cancel: "Cancel order",
    reason: "Cancellation reason",
    restock: "Return quantity to stock (once)",
    refundNote: "Refunds are issued from the payment provider dashboard and recorded in the audit log.",
    confirm: (r: string) => `I confirm cancelling order ${r}`,
    confirmCancel: "Confirm cancellation",
    timeline: "Timeline",
    streams: { ORDER: "Order", PAYMENT: "Payment", SHIPPING: "Shipping" } as Record<string, string>,
    carrier: "Aramex",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

function Card({ icon: Icon, title, sub, children, className = "" }: { icon: typeof Package; title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <Icon className="size-4 text-primary" aria-hidden />
        <h2 className="font-semibold">{title}</h2>
        {sub && <span className="text-xs text-muted-foreground">· {sub}</span>}
      </div>
      <div className="p-5 text-sm">{children}</div>
    </section>
  );
}

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const L = statusLabels(locale);
  const sar = (h: number) => formatSAR(h, locale);
  const d = await getOrderAdmin((await params).id);
  if (!d) notFound();
  const o = d.order;
  const from = o.orderStatus as OrderStatus;
  const manualTargets = (Object.keys(ORDER_TRANSITIONS) as OrderStatus[]).filter(
    (to) => to !== "CANCELLED" && from !== "PENDING" && canTransition(ORDER_TRANSITIONS, from, to) && (from !== "REQUIRES_RECONCILIATION" || user.role === "ADMIN"),
  );
  const canShip = o.paymentStatus === "PAID" && ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPPING"].includes(from) && d.shipment?.createState !== "DONE";
  const canCancel = canTransition(ORDER_TRANSITIONS, from, "CANCELLED");
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;

  const timeline = [
    ...d.events.map((e) => ({
      id: e.id,
      at: new Date(e.createdAt),
      label: t.streams[e.stream] ?? e.stream,
      text: `${e.fromStatus ?? "∅"} → ${e.toStatus}${e.note ? ` — ${e.note}` : ""}`,
    })),
    ...d.shipmentEvents.map((e) => ({ id: e.id, at: new Date(e.occurredAt), label: t.carrier, text: e.description })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <Back className="size-4" aria-hidden /> {t.back}
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.order} <span dir="ltr" className="font-mono">{o.reference}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatDate(o.createdAt, true, locale)}</p>
        </div>
        <StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} locale={locale} compact />
      </div>
      <Flash sp={await searchParams} />
      {o.orderStatus === "REQUIRES_RECONCILIATION" && (
        <div role="alert" className="mb-5 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{t.review}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card icon={Package} title={t.items}>
            <div className="-mx-5 -mt-5 border-b border-border">
              <Table head={t.cols} bare>
                {d.items.map((i) => (
                  <tr key={i.id}>
                    <td className="font-mono text-xs" dir="ltr">{i.skuSnapshot}</td>
                    <td>
                      <span className="block font-medium">{i.nameSnapshot}</span>
                      <span className="block text-xs text-muted-foreground">{i.colorSnapshot} / {i.sizeSnapshot}</span>
                    </td>
                    <td>
                      {t.mode[i.purchaseMode as "RETAIL" | "BULK"]}
                      {i.tierSnapshot ? <span className="text-muted-foreground"> ({i.tierSnapshot.minQty}{i.tierSnapshot.maxQty ? `–${i.tierSnapshot.maxQty}` : "+"})</span> : null}
                    </td>
                    <td className="tabular">{i.quantity}</td>
                    <td className="tabular whitespace-nowrap">{sar(i.unitPriceHalalas)}</td>
                    <td className="tabular whitespace-nowrap font-semibold">{sar(i.lineTotalHalalas)}</td>
                  </tr>
                ))}
              </Table>
            </div>
            <dl className="tabular ms-auto mt-4 grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
              <dt className="text-muted-foreground">{t.subtotal}</dt>
              <dd className="text-end">{sar(o.subtotalHalalas)}</dd>
              <dt className="text-muted-foreground">{t.shipping}</dt>
              <dd className="text-end">{sar(o.shippingHalalas)}</dd>
              <dt className="text-muted-foreground">{t.tax} {o.pricesIncludeVat ? t.included : ""}</dt>
              <dd className="text-end">{sar(o.taxHalalas)}</dd>
              <dt className="mt-1 border-t border-border pt-2 font-semibold">{t.total}</dt>
              <dd className="mt-1 border-t border-border pt-2 text-end text-base font-bold">{sar(o.totalHalalas)}</dd>
            </dl>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card icon={CreditCard} title={t.payment}>
              {d.attempts.length ? (
                <ul className="space-y-2">
                  {d.attempts.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
                      <span>
                        <span className="font-medium">{a.provider}</span>
                        <span dir="ltr" className="ms-2 font-mono text-xs text-muted-foreground">{a.providerRef ?? "—"}</span>
                      </span>
                      <span className="tabular text-xs">{a.status} · {sar(a.amountHalalas)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{t.noAttempts}</p>
              )}
              {o.paidAt && <p className="mt-3 text-xs text-muted-foreground">{t.paidAt}: {formatDate(o.paidAt, true, locale)}</p>}
            </Card>

            <Card icon={Truck} title={t.aramex}>
              {d.shipment ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                  <dt className="text-muted-foreground">AWB</dt>
                  <dd dir="ltr" className="font-mono text-end">{d.shipment.awb ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t.status}</dt>
                  <dd className="text-end">{L.shipping[d.shipment.status as ShipmentStatus]}</dd>
                  {d.shipment.lastError && (
                    <>
                      <dt className="text-destructive">{t.lastError}</dt>
                      <dd className="text-end text-destructive">{d.shipment.lastError}</dd>
                    </>
                  )}
                </dl>
              ) : (
                <p className="text-muted-foreground">{t.noShipment}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {d.shipment?.awb && (
                  <form action={refreshShipmentAction}>
                    <input type="hidden" name="shipmentId" value={d.shipment.id} />
                    <input type="hidden" name="back" value={`/admin/orders/${o.id}`} />
                    <button className={btnOutlineCls}>
                      <RefreshCw className="size-4" aria-hidden /> {t.refresh}
                    </button>
                  </form>
                )}
                {canShip && (
                  <form action={createShipmentAction}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className={btnCls}>
                      <Truck className="size-4" aria-hidden />
                      {d.shipment?.createState === "ERROR" ? t.retryShipment : t.createShipment}
                    </button>
                  </form>
                )}
              </div>
            </Card>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <Card icon={Settings2} title={t.actions}>
            {manualTargets.length > 0 ? (
              <form action={orderStatusAction} className="space-y-3">
                <input type="hidden" name="orderId" value={o.id} />
                <label className="block">
                  <span className="mb-1.5 block font-medium">{t.changeStatus}</span>
                  <select name="status" className={inputCls}>
                    {manualTargets.map((s) => (
                      <option key={s} value={s}>{L.order[s]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">{t.note}</span>
                  <input name="note" placeholder={t.note} className={inputCls} />
                </label>
                <button className={`${btnCls} w-full`}>{t.update}</button>
              </form>
            ) : (
              <p className="text-muted-foreground">{t.noActions}</p>
            )}
            {canCancel && (
              <details className="group mt-4 rounded-lg border border-red-100 bg-red-50/40 open:bg-red-50/60">
                <summary className="cursor-pointer list-none px-3 py-2.5 font-medium text-destructive marker:hidden">{t.cancel}</summary>
                <form action={orderCancelAction} className="space-y-3 px-3 pb-3">
                  <input type="hidden" name="orderId" value={o.id} />
                  <label className="block">
                    <span className="sr-only">{t.reason}</span>
                    <input name="reason" required minLength={3} placeholder={t.reason} className={inputCls} />
                  </label>
                  {o.paymentStatus === "PAID" && (
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" name="restock" defaultChecked className="size-4 accent-primary" /> {t.restock}
                    </label>
                  )}
                  {o.paymentStatus === "PAID" && <p className="text-xs text-muted-foreground">{t.refundNote}</p>}
                  <ConfirmBox label={t.confirm(o.reference)} />
                  <button className="min-h-10 w-full rounded-lg bg-destructive px-4 text-sm font-semibold text-white transition-colors hover:bg-destructive/90">{t.confirmCancel}</button>
                </form>
              </details>
            )}
          </Card>

          <Card icon={MapPin} title={t.delivery} sub={t.deliveryNote}>
            <address className="space-y-1 not-italic">
              <p className="font-medium">{o.customerSnapshot.name}</p>
              <p dir="ltr" className="text-start font-mono text-xs text-muted-foreground">{o.customerSnapshot.phone}</p>
              <p>{o.addressSnapshot.city}، {o.addressSnapshot.district}</p>
              <p>{o.addressSnapshot.street}، {t.building} {o.addressSnapshot.building}</p>
              <p className="text-muted-foreground">{o.addressSnapshot.postalCode}</p>
            </address>
          </Card>

          <Card icon={History} title={t.timeline}>
            <ol className="relative space-y-4 border-s border-border ps-5">
              {timeline.map((e, i) => (
                <li key={e.id} className="relative">
                  <span aria-hidden className={`absolute -start-[1.6rem] top-1 size-2.5 rounded-full ring-4 ring-card ${i === 0 ? "bg-primary" : "bg-stone-300"}`} />
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.at, true, locale)} · <span className="font-medium text-foreground/80">{e.label}</span>
                  </p>
                  <p className="mt-0.5 break-words">{e.text}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
