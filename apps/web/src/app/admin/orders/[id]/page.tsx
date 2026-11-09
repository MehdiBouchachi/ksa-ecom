import { formatDate } from "@saudi-ecom/contracts";
import { notFound } from "next/navigation";
import { canTransition, formatSAR, ORDER_TRANSITIONS, type OrderStatus, type ShipmentStatus } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { btnCls, btnOutlineCls, ConfirmBox, Flash, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { modeLabel, orderStatusLabel, shipmentStatusLabel } from "@/i18n/ar";
import { requireStaff } from "@/server/auth/guards";
import { getOrderAdmin } from "@/server/orders/queries";
import { createShipmentAction, orderCancelAction, orderStatusAction, refreshShipmentAction } from "../../actions";

export const metadata = { title: "تفاصيل الطلب" };

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await requireStaff();
  const d = await getOrderAdmin((await params).id);
  if (!d) notFound();
  const o = d.order;
  const from = o.orderStatus as OrderStatus;
  const manualTargets = (Object.keys(ORDER_TRANSITIONS) as OrderStatus[]).filter(
    (to) => to !== "CANCELLED" && from !== "PENDING" && canTransition(ORDER_TRANSITIONS, from, to) && (from !== "REQUIRES_RECONCILIATION" || user.role === "ADMIN"),
  );
  const canShip = o.paymentStatus === "PAID" && ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPPING"].includes(from) && d.shipment?.createState !== "DONE";
  const canCancel = canTransition(ORDER_TRANSITIONS, from, "CANCELLED");
  return (
    <>
      <PageTitle actions={<StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} />}>
        طلب <span dir="ltr" className="font-mono">{o.reference}</span>
      </PageTitle>
      <Flash sp={await searchParams} />
      {o.orderStatus === "REQUIRES_RECONCILIATION" && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">تم استلام دفع متأخر أو غير مطابق. راجع المخزون والدفع: خصص الكمية يدويًا ثم أكد الطلب (مدير عام)، أو ألغِ الطلب وقم بالاسترداد من لوحة مزود الدفع.</p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-4 text-sm lg:col-span-2">
          <h2 className="mb-2 font-bold">المنتجات (لقطة وقت الطلب)</h2>
          <Table head={["SKU", "المنتج", "النوع", "الكمية", "سعر القطعة", "الإجمالي"]}>
            {d.items.map((i) => (
              <tr key={i.id}>
                <td className="font-mono" dir="ltr">{i.skuSnapshot}</td>
                <td>{i.nameSnapshot} — {i.colorSnapshot} / {i.sizeSnapshot}</td>
                <td>{modeLabel[i.purchaseMode as "RETAIL" | "BULK"]}{i.tierSnapshot ? ` (${i.tierSnapshot.minQty}${i.tierSnapshot.maxQty ? `–${i.tierSnapshot.maxQty}` : "+"})` : ""}</td>
                <td>{i.quantity}</td>
                <td>{formatSAR(i.unitPriceHalalas)}</td>
                <td>{formatSAR(i.lineTotalHalalas)}</td>
              </tr>
            ))}
          </Table>
          <dl className="mt-3 grid grid-cols-2 gap-1 sm:w-72">
            <dt>المجموع الفرعي</dt><dd>{formatSAR(o.subtotalHalalas)}</dd>
            <dt>الشحن</dt><dd>{formatSAR(o.shippingHalalas)}</dd>
            <dt>الضريبة {o.pricesIncludeVat ? "(مشمولة)" : ""}</dt><dd>{formatSAR(o.taxHalalas)}</dd>
            <dt className="font-bold">الإجمالي</dt><dd className="font-bold">{formatSAR(o.totalHalalas)}</dd>
          </dl>
        </section>
        <section className="space-y-1 rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-bold">بيانات التوصيل (لهذا الطلب فقط)</h2>
          <p>{o.customerSnapshot.name}</p>
          <p dir="ltr" className="text-end">{o.customerSnapshot.phone}</p>
          <p>{o.addressSnapshot.city}، {o.addressSnapshot.district}</p>
          <p>{o.addressSnapshot.street}، مبنى {o.addressSnapshot.building}</p>
          <p>{o.addressSnapshot.postalCode}</p>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-bold">الدفع</h2>
          {d.attempts.length ? d.attempts.map((a) => (
            <p key={a.id}>{a.provider} · <span dir="ltr" className="font-mono">{a.providerRef ?? "—"}</span> · {a.status} · {formatSAR(a.amountHalalas)}</p>
          )) : <p className="text-muted-foreground">لا توجد محاولات دفع.</p>}
          {o.paidAt && <p className="mt-1">تاريخ الدفع المتحقق: {formatDate(o.paidAt, true)}</p>}
        </section>
        <section className="rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-bold">الشحن (أرامكس)</h2>
          {d.shipment ? (
            <>
              <p>AWB: <span dir="ltr" className="font-mono">{d.shipment.awb ?? "—"}</span></p>
              <p>الحالة: {shipmentStatusLabel[d.shipment.status as ShipmentStatus]}</p>
              {d.shipment.lastError && <p className="text-destructive">آخر خطأ: {d.shipment.lastError}</p>}
              {d.shipment.awb && (
                <form action={refreshShipmentAction} className="mt-2">
                  <input type="hidden" name="shipmentId" value={d.shipment.id} />
                  <input type="hidden" name="back" value={`/admin/orders/${o.id}`} />
                  <button className={btnOutlineCls}>تحديث التتبع</button>
                </form>
              )}
            </>
          ) : <p className="text-muted-foreground">لم تُنشأ شحنة.</p>}
          {canShip && (
            <form action={createShipmentAction} className="mt-2">
              <input type="hidden" name="orderId" value={o.id} />
              <button className={btnCls}>{d.shipment?.createState === "ERROR" ? "إعادة محاولة إنشاء الشحنة" : "إنشاء شحنة أرامكس"}</button>
            </form>
          )}
        </section>
        <section className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="font-bold">الإجراءات</h2>
          {manualTargets.length > 0 && (
            <form action={orderStatusAction} className="space-y-2">
              <input type="hidden" name="orderId" value={o.id} />
              <label className="block">تغيير حالة الطلب
                <select name="status" className={inputCls}>{manualTargets.map((s) => <option key={s} value={s}>{orderStatusLabel[s]}</option>)}</select>
              </label>
              <input name="note" placeholder="ملاحظة (اختياري)" className={inputCls} />
              <button className={btnCls}>تحديث</button>
            </form>
          )}
          {canCancel && (
            <details>
              <summary className="cursor-pointer text-destructive">إلغاء الطلب</summary>
              <form action={orderCancelAction} className="mt-2 space-y-2">
                <input type="hidden" name="orderId" value={o.id} />
                <input name="reason" required minLength={3} placeholder="سبب الإلغاء" className={inputCls} />
                {o.paymentStatus === "PAID" && <label className="flex items-center gap-2"><input type="checkbox" name="restock" defaultChecked className="size-4" /> إعادة الكمية للمخزون (مرة واحدة)</label>}
                {o.paymentStatus === "PAID" && <p className="text-xs text-muted-foreground">الاسترداد المالي يتم عبر لوحة مزود الدفع ويسجَّل في سجل التدقيق.</p>}
                <ConfirmBox label={`أؤكد إلغاء الطلب ${o.reference}`} />
                <button className="min-h-10 rounded-md bg-destructive px-4 text-sm font-semibold text-white">تأكيد الإلغاء</button>
              </form>
            </details>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-border bg-card p-4 text-sm">
        <h2 className="mb-2 font-bold">السجل الزمني</h2>
        <ol className="space-y-1">
          {d.events.map((e) => (
            <li key={e.id}><span className="text-muted-foreground">{formatDate(e.createdAt, true)}</span> · {e.stream} · {e.fromStatus ?? "∅"} → {e.toStatus}{e.note ? ` — ${e.note}` : ""}</li>
          ))}
          {d.shipmentEvents.map((e) => (
            <li key={e.id}><span className="text-muted-foreground">{formatDate(e.occurredAt, true)}</span> · أرامكس · {e.description}</li>
          ))}
        </ol>
      </section>
    </>
  );
}
