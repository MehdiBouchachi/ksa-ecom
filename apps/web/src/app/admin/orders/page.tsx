import { formatDate } from "@saudi-ecom/contracts";
import Link from "next/link";
import { formatSAR, ORDER_STATUSES } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { btnCls, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { orderStatusLabel } from "@/i18n/ar";
import { requireStaff } from "@/server/auth/guards";
import { listOrdersAdmin } from "@/server/orders/queries";

export const metadata = { title: "الطلبات" };

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; payment?: string; q?: string; page?: string }> }) {
  await requireStaff();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const r = await listOrdersAdmin({ status: sp.status, payment: sp.payment, q: sp.q, page });
  const qs = (p: number) => new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.payment ? { payment: sp.payment } : {}), ...(sp.q ? { q: sp.q } : {}), page: String(p) }).toString();
  return (
    <>
      <PageTitle>الطلبات</PageTitle>
      <form className="mb-4 grid gap-2 sm:grid-cols-4" method="get">
        <label className="sr-only" htmlFor="oq">بحث</label>
        <input id="oq" name="q" defaultValue={sp.q} placeholder="رقم الطلب أو اسم العميل" className={inputCls} />
        <label className="sr-only" htmlFor="os">حالة الطلب</label>
        <select id="os" name="status" defaultValue={sp.status ?? ""} className={inputCls}>
          <option value="">كل حالات الطلب</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{orderStatusLabel[s]}</option>)}
        </select>
        <label className="sr-only" htmlFor="op">حالة الدفع</label>
        <select id="op" name="payment" defaultValue={sp.payment ?? ""} className={inputCls}>
          <option value="">كل حالات الدفع</option>
          <option value="PENDING">معلق</option><option value="PAID">مدفوع</option><option value="FAILED">فشل</option><option value="REFUNDED">مسترد</option>
        </select>
        <button className={btnCls}>تصفية</button>
      </form>
      <Table head={["المرجع", "العميل (من الطلب)", "الحالات", "الإجمالي", "التاريخ"]} empty={!r.items.length}>
        {r.items.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-primary" dir="ltr">{o.reference}</Link></td>
            <td>{o.customerName}</td>
            <td><StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} /></td>
            <td>{formatSAR(o.totalHalalas)}</td>
            <td>{formatDate(o.createdAt, true)}</td>
          </tr>
        ))}
      </Table>
      <nav className="mt-4 flex items-center justify-center gap-2 text-sm" aria-label="الصفحات">
        {page > 1 && <Link href={`?${qs(page - 1)}`} className="rounded-md border border-input px-3 py-2">السابق</Link>}
        <span>{r.total} طلب</span>
        {page * r.pageSize < r.total && <Link href={`?${qs(page + 1)}`} className="rounded-md border border-input px-3 py-2">التالي</Link>}
      </nav>
    </>
  );
}
