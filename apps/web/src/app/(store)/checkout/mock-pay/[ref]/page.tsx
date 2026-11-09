import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { formatSAR } from "@saudi-ecom/contracts";
import { Alert } from "@/components/ui/card";
import { signPayload } from "@/server/lib/hmac";
import { MockPaymentProvider } from "@/server/payments/mock-provider";
import { handlePaymentWebhook } from "@/server/payments/service";

export const metadata = { title: "بوابة دفع تجريبية", robots: { index: false, follow: false } };

const enabled = () => (process.env.PAYMENT_PROVIDER ?? "mock") === "mock" && (process.env.NODE_ENV !== "production" || process.env.ALLOW_MOCK_PAYMENTS === "1");

/** SANDBOX ONLY: simulates the PSP hosted page and its signed webhook. Disabled in production. */
export default async function MockPay({ params }: { params: Promise<{ ref: string }> }) {
  if (!enabled()) notFound();
  const { ref } = await params;
  const s = MockPaymentProvider.getSession(ref);
  if (!s) notFound();

  async function complete(formData: FormData) {
    "use server";
    if (!enabled()) notFound();
    const status = formData.get("status") === "PAID" ? "PAID" : "FAILED";
    const sess = MockPaymentProvider.getSession(ref);
    if (!sess) notFound();
    MockPaymentProvider.setStatus(ref, status);
    const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: `payment.${status.toLowerCase()}`, data: { providerRef: ref, status, amountHalalas: sess.amountHalalas, currency: "SAR", orderReference: sess.orderReference } });
    await handlePaymentWebhook(body, new Headers({ "x-mock-signature": signPayload(process.env.PAYMENT_WEBHOOK_SECRET!, body) }));
    redirect(`/checkout/result?ref=${encodeURIComponent(sess.orderReference)}`);
  }

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border border-border bg-card p-6">
      <Alert tone="warning">بيئة اختبار — لا يتم خصم أي مبلغ حقيقي.</Alert>
      <h1 className="text-xl font-bold">بوابة الدفع التجريبية</h1>
      <p>الطلب <span dir="ltr" className="font-mono">{s.orderReference}</span></p>
      <p className="text-2xl font-bold">{formatSAR(s.amountHalalas)}</p>
      <form action={complete} className="flex gap-2">
        <button name="status" value="PAID" className="min-h-12 flex-1 rounded-md bg-primary font-semibold text-white">محاكاة دفع ناجح</button>
        <button name="status" value="FAILED" className="min-h-12 flex-1 rounded-md border border-destructive font-semibold text-destructive">محاكاة فشل الدفع</button>
      </form>
    </div>
  );
}
