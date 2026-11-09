import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatSAR } from "@saudi-ecom/contracts";
import { ResultPoller } from "@/components/cart/result-poller";
import { Alert } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/guards";
import { isAppError } from "@/server/lib/errors";
import { getCheckoutStatus } from "@/server/payments/service";

export const metadata: Metadata = { title: "نتيجة الدفع", robots: { index: false, follow: false } };

/** Status comes from the server (verified webhook/reconciliation), never from query parameters. */
export default async function ResultPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const user = await getCurrentUser();
  const ref = (await searchParams).ref ?? "";
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(`/checkout/result?ref=${ref}`)}`);
  let s;
  try {
    s = await getCheckoutStatus(user.id, ref);
  } catch (e) {
    if (isAppError(e) && e.code === "NOT_FOUND") return <Alert tone="danger">لم يتم العثور على الطلب.</Alert>;
    throw e;
  }
  const paid = s.paymentStatus === "PAID";
  const failed = s.paymentStatus === "FAILED" || s.orderStatus === "CANCELLED";
  const pending = !paid && !failed;
  return (
    <div className="mx-auto max-w-xl space-y-4 text-center">
      <ResultPoller paid={paid} pending={pending} />
      <h1 className="text-2xl font-bold">{paid ? "تم تأكيد الدفع، شكرًا لك!" : failed ? "لم يكتمل الدفع" : "جارٍ التحقق من الدفع…"}</h1>
      <p className="text-muted-foreground">رقم الطلب: <span dir="ltr" className="font-mono">{s.reference}</span> · الإجمالي {formatSAR(s.totalHalalas)}</p>
      {pending && <Alert>نتحقق من حالة الدفع مع مزود الدفع. ستتحدث هذه الصفحة تلقائيًا.</Alert>}
      {s.orderStatus === "REQUIRES_RECONCILIATION" && <Alert tone="warning">استلمنا الدفع ونراجع توفر المنتجات. سيتواصل معك فريقنا قريبًا.</Alert>}
      {failed && <Alert tone="danger">تم إلغاء الطلب وتحرير المنتجات. يمكنك المحاولة مرة أخرى من السلة.</Alert>}
      <div className="flex justify-center gap-3">
        <Link href={`/account/orders/${s.id}`} className="rounded-md bg-primary px-5 py-3 font-semibold text-white">تفاصيل الطلب</Link>
        {failed && <Link href="/cart" className="rounded-md border border-input px-5 py-3 font-semibold">العودة للسلة</Link>}
      </div>
    </div>
  );
}
