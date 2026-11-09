import { formatDate } from "@saudi-ecom/contracts";
import Link from "next/link";
import { formatSAR, type OrderStatus } from "@saudi-ecom/contracts";
import { PageTitle, Table } from "@/components/admin/ui";
import { StatusBadges } from "@/components/account/status-badges";
import { orderStatusLabel } from "@/i18n/ar";
import { getDashboard } from "@/server/admin/dashboard";
import { requireStaff } from "@/server/auth/guards";

export default async function Dashboard() {
  await requireStaff();
  const d = await getDashboard(30);
  const tiles: [string, string | number][] = [
    ["الإيرادات (30 يومًا)", formatSAR(d.revenueHalalas)],
    ["طلبات مدفوعة (30 يومًا)", d.paidOrders],
    ["بانتظار الدفع", d.byStatus.PENDING ?? 0],
    ["قيد التجهيز", (d.byStatus.CONFIRMED ?? 0) + (d.byStatus.PROCESSING ?? 0) + (d.byStatus.READY_FOR_SHIPPING ?? 0)],
    ["تم الشحن", d.byStatus.SHIPPED ?? 0],
    ["تم التسليم", d.byStatus.DELIVERED ?? 0],
  ];
  return (
    <>
      <PageTitle>نظرة عامة</PageTitle>
      {(d.byStatus.REQUIRES_RECONCILIATION ?? 0) > 0 && (
        <Link href="/admin/orders?status=REQUIRES_RECONCILIATION" className="mb-4 block rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {d.byStatus.REQUIRES_RECONCILIATION} طلب يتطلب مراجعة (دفع متأخر أو عدم تطابق) — اضغط للعرض
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tiles.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{k}</p>
            <p className="mt-1 text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-2 mt-8 text-lg font-bold">أحدث الطلبات</h2>
      <Table head={["المرجع", "الحالات", "الإجمالي", "التاريخ"]} empty={!d.recent.length}>
        {d.recent.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-primary" dir="ltr">{o.reference}</Link></td>
            <td><StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} /></td>
            <td>{formatSAR(o.totalHalalas)}</td>
            <td>{formatDate(o.createdAt, true)}</td>
          </tr>
        ))}
      </Table>
      <h2 className="mb-2 mt-8 text-lg font-bold">تنبيهات المخزون</h2>
      <Table head={["SKU", "اللون / المقاس", "المتوفر", "المحجوز"]} empty={!d.lowStock.length}>
        {d.lowStock.map((s) => (
          <tr key={s.variantId}>
            <td className="font-mono" dir="ltr">{s.sku}</td>
            <td>{s.color} / {s.size}</td>
            <td className={s.available === 0 ? "font-bold text-destructive" : ""}>{s.available}</td>
            <td>{s.reserved}</td>
          </tr>
        ))}
      </Table>
      <p className="mt-6 text-xs text-muted-foreground">حالات الطلبات: {Object.entries(d.byStatus).map(([k, v]) => `${orderStatusLabel[k as OrderStatus] ?? k}: ${v}`).join(" · ") || "—"}</p>
    </>
  );
}
