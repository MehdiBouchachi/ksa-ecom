import { formatDate } from "@saudi-ecom/contracts";
import { notFound } from "next/navigation";
import type { ShipmentStatus } from "@saudi-ecom/contracts";
import { shipmentStatusLabel } from "@/i18n/ar";
import { requireUser } from "@/server/auth/guards";
import { getTrackingForUser } from "@/server/shipping/service";

export const metadata = { title: "تتبع الشحنة" };

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const t = await getTrackingForUser(user.id, id);
  if (!t) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">تتبع الطلب <span dir="ltr" className="font-mono">{t.order.reference}</span></h1>
      {!t.shipment ? (
        <p className="rounded-lg border border-border bg-card p-4">لم يتم إنشاء الشحنة بعد. سنبلغك عند الشحن.</p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-card p-4">
            <p>شركة الشحن: أرامكس</p>
            <p>رقم البوليصة (AWB): <span dir="ltr" className="font-mono font-semibold">{t.shipment.awb}</span></p>
            <p>الحالة: <strong>{shipmentStatusLabel[t.shipment.status as ShipmentStatus] ?? t.shipment.status}</strong></p>
          </div>
          <ol className="relative space-y-4 border-s-2 border-border ps-6">
            {t.events.map((e, i) => (
              <li key={i}>
                <span className="absolute -start-[7px] mt-1.5 size-3 rounded-full bg-primary" aria-hidden />
                <p className="font-semibold">{e.description}</p>
                <p className="text-sm text-muted-foreground">{formatDate(e.occurredAt, true)}{e.location ? ` · ${e.location}` : ""}</p>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
