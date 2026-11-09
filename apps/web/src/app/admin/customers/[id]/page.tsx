import { formatDate } from "@saudi-ecom/contracts";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatSAR } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { btnOutlineCls, ConfirmBox, Flash, PageTitle, Table } from "@/components/admin/ui";
import { getCustomer } from "@/server/admin/people";
import { adminOrNull } from "@/server/auth/guards";
import { Forbidden } from "@/components/admin/forbidden";
import { customerStatusAction } from "../../actions";

export default async function Customer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await adminOrNull();
  if (!user) return <Forbidden />;
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getCustomer(user, id);
  if (!c) notFound();
  return (
    <>
      <PageTitle>{c.fullName}</PageTitle>
      <Flash sp={await searchParams} />
      <div className="mb-4 rounded-lg border border-border bg-card p-4 text-sm">
        <p dir="ltr" className="text-end">{c.email} · {c.phone ?? "—"}</p>
        <p>الحالة: {c.status === "ACTIVE" ? "نشط" : "معطل"} · آخر دخول: {(c.lastLoginAt ? formatDate(c.lastLoginAt, true) : "—")}</p>
        <form action={customerStatusAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="status" value={c.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
          <ConfirmBox label={c.status === "ACTIVE" ? "تعطيل الحساب وتسجيل خروجه" : "إعادة تفعيل الحساب"} />
          <button className={btnOutlineCls}>{c.status === "ACTIVE" ? "تعطيل" : "تفعيل"}</button>
        </form>
      </div>
      <Table head={["الطلب", "الحالات", "الإجمالي", "التاريخ"]} empty={!c.orders.length}>
        {c.orders.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/orders/${o.id}`} className="font-mono text-primary" dir="ltr">{o.reference}</Link></td>
            <td><StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping="NOT_CREATED" /></td>
            <td>{formatSAR(o.totalHalalas)}</td>
            <td>{formatDate(o.createdAt)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
