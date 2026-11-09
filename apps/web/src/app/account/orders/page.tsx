import { formatDate } from "@saudi-ecom/contracts";
import Link from "next/link";
import { formatSAR } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { requireUser } from "@/server/auth/guards";
import { listOrdersForUser } from "@/server/orders/queries";

export const metadata = { title: "طلباتي" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await requireUser();
  const page = Math.max(1, Number((await searchParams).page ?? 1) || 1);
  const { items, total, pageSize } = await listOrdersForUser(user.id, page);
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">طلباتي</h1>
      {!items.length ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p>لا توجد طلبات بعد.</p>
          <Link href="/products" className="mt-3 inline-block font-semibold text-primary">ابدأ التسوق</Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <Link href={`/account/orders/${o.id}`} className="font-mono font-semibold" dir="ltr">{o.reference}</Link>
                <p className="text-sm text-muted-foreground">{formatDate(o.createdAt)} · {formatSAR(o.totalHalalas)}</p>
              </div>
              <StatusBadges order={o.orderStatus} payment={o.paymentStatus} shipping={o.shippingStatus} />
            </li>
          ))}
        </ul>
      )}
      {total > pageSize && (
        <nav className="mt-4 flex justify-center gap-2" aria-label="الصفحات">
          {page > 1 && <Link href={`?page=${page - 1}`} className="rounded-md border border-input px-4 py-2">السابق</Link>}
          {page * pageSize < total && <Link href={`?page=${page + 1}`} className="rounded-md border border-input px-4 py-2">التالي</Link>}
        </nav>
      )}
    </>
  );
}
