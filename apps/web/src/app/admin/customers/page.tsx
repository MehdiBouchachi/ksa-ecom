import { formatDate } from "@saudi-ecom/contracts";
import Link from "next/link";
import { btnCls, inputCls, PageTitle, Table } from "@/components/admin/ui";
import { listCustomers } from "@/server/admin/people";
import { adminOrNull } from "@/server/auth/guards";
import { Forbidden } from "@/components/admin/forbidden";

export const metadata = { title: "العملاء" };

/** ADMIN ONLY. A Manager hitting this URL gets the 403 error page (requireAdmin throws FORBIDDEN). */
export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await adminOrNull();
  if (!user) return <Forbidden />;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const r = await listCustomers(user, { q: sp.q, page });
  return (
    <>
      <PageTitle>العملاء</PageTitle>
      <form method="get" className="mb-4 flex max-w-md gap-2">
        <label className="sr-only" htmlFor="cq">بحث</label>
        <input id="cq" name="q" defaultValue={sp.q} placeholder="اسم أو بريد أو جوال" className={inputCls} />
        <button className={btnCls}>بحث</button>
      </form>
      <Table head={["الاسم", "البريد", "الجوال", "الطلبات", "الحالة", "التسجيل"]} empty={!r.items.length}>
        {r.items.map((c) => (
          <tr key={c.id}>
            <td><Link href={`/admin/customers/${c.id}`} className="text-primary">{c.fullName}</Link></td>
            <td dir="ltr">{c.email}</td>
            <td dir="ltr">{c.phone ?? "—"}</td>
            <td>{c.orders}</td>
            <td>{c.status === "ACTIVE" ? "نشط" : "معطل"}</td>
            <td>{formatDate(c.createdAt)}</td>
          </tr>
        ))}
      </Table>
      <nav className="mt-4 flex justify-center gap-2 text-sm" aria-label="الصفحات">
        {page > 1 && <Link href={`?page=${page - 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className="rounded-md border border-input px-3 py-2">السابق</Link>}
        <span className="py-2">{r.total} عميل</span>
        {page * r.pageSize < r.total && <Link href={`?page=${page + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`} className="rounded-md border border-input px-3 py-2">التالي</Link>}
      </nav>
    </>
  );
}
