import { statusLabels } from "@/i18n/admin";
import { cn } from "@/lib/utils";

/** A compact reading order for order, payment, and shipping states in admin lists. */
export function OrderStatusSummary({ order, payment, shipping, locale }: { order: string; payment: string; shipping?: string | null; locale: "ar" | "en" }) {
  const labels = statusLabels(locale);
  const orderLabel = labels.order[order as keyof typeof labels.order] ?? order;
  const paymentLabel = labels.payment[payment as keyof typeof labels.payment] ?? payment;
  const shippingLabel = shipping ? labels.shipping[shipping as keyof typeof labels.shipping] ?? shipping : null;
  const dot = order === "DELIVERED" ? "bg-emerald-600" : order === "PENDING" || order === "REQUIRES_RECONCILIATION" ? "bg-amber-600" : order === "CANCELLED" || order === "RETURNED" ? "bg-red-600" : "bg-primary";

  return (
    <span className="block min-w-0">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden />
        {orderLabel}
      </span>
      <span className="block text-[11px] leading-4 text-muted-foreground">
        {labels.prefix.payment}: {paymentLabel}{shippingLabel ? ` · ${labels.prefix.shipping}: ${shippingLabel}` : ""}
      </span>
    </span>
  );
}
