import Link from "next/link";
import { notFound } from "next/navigation";
import { formatSAR } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { Alert } from "@/components/ui/card";
import { modeLabel } from "@/i18n/ar";
import { requireUser } from "@/server/auth/guards";
import { getOrderForUser } from "@/server/orders/queries";

export const metadata = { title: "تفاصيل الطلب" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const o = await getOrderForUser(user.id, (await params).id);
  if (!o) notFound(); // someone else's order is indistinguishable from a missing one
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">طلب <span dir="ltr" className="font-mono">{o.reference}</span></h1>
        <StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} />
      </div>
      {o.orderStatus === "PENDING" && o.paymentStatus === "PENDING" && <Alert tone="warning">الطلب بانتظار إتمام الدفع. المنتجات محجوزة لفترة محدودة.</Alert>}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted text-start"><tr><th className="p-3 text-start">المنتج</th><th className="p-3 text-start">SKU</th><th className="p-3 text-start">الكمية</th><th className="p-3 text-start">سعر القطعة</th><th className="p-3 text-start">الإجمالي</th></tr></thead>
          <tbody>
            {o.items.map((i) => (
              <tr key={i.sku + i.purchaseMode} className="border-t border-border">
                <td className="p-3">{i.name} — {i.color} / {i.size} <span className="text-muted-foreground">({modeLabel[i.purchaseMode as "RETAIL" | "BULK"]})</span></td>
                <td className="p-3 font-mono" dir="ltr">{i.sku}</td>
                <td className="p-3">{i.quantity}</td>
                <td className="p-3">{formatSAR(i.unitPriceHalalas)}</td>
                <td className="p-3">{formatSAR(i.lineTotalHalalas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-bold">عنوان الشحن</h2>
          <p>{o.customer.name} · <span dir="ltr">{o.customer.phone}</span></p>
          <p>{o.address.city}، {o.address.district}، {o.address.street}، مبنى {o.address.building}، {o.address.postalCode}</p>
        </section>
        <section className="rounded-lg border border-border bg-card p-4 text-sm">
          <h2 className="mb-2 font-bold">الملخص</h2>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd>{formatSAR(o.subtotalHalalas)}</dd></div>
            <div className="flex justify-between"><dt>الشحن</dt><dd>{formatSAR(o.shippingHalalas)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>ضريبة القيمة المضافة {o.pricesIncludeVat ? "(مشمولة)" : ""}</dt><dd>{formatSAR(o.taxHalalas)}</dd></div>
            <div className="flex justify-between font-bold"><dt>الإجمالي</dt><dd>{formatSAR(o.totalHalalas)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">هذا ملخص الطلب وليس فاتورة ضريبية.</p>
        </section>
      </div>
      <Link href={`/account/orders/${o.id}/tracking`} className="inline-flex min-h-11 items-center rounded-md border border-input px-4 font-semibold">تتبع الشحنة</Link>
    </div>
  );
}
