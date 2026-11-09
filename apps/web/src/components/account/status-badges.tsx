import { Badge } from "@/components/ui/card";
import { statusLabels } from "@/i18n/admin";

const orderTone = (s: string) => (["CANCELLED", "RETURNED"].includes(s) ? "danger" : s === "REQUIRES_RECONCILIATION" || s === "PENDING" ? "warning" : s === "DELIVERED" ? "success" : "info");
const payTone = (s: string) => (s === "PAID" ? "success" : s === "FAILED" ? "danger" : s === "REFUNDED" ? "neutral" : "warning");
const shipTone = (s: string) => (s === "DELIVERED" ? "success" : s === "FAILED" || s === "RETURNED" ? "danger" : s === "NOT_CREATED" ? "neutral" : "info");

/** Three independent state machines, shown side by side (ACC-14). */
export function StatusBadges({ order, payment, shipping, locale = "ar" }: { order: string; payment: string; shipping: string; locale?: "ar" | "en" }) {
  const L = statusLabels(locale);
  return (
    <span className="flex flex-wrap gap-1">
      <Badge tone={orderTone(order)}>{L.prefix.order}: {L.order[order as keyof typeof L.order] ?? order}</Badge>
      <Badge tone={payTone(payment)}>{L.prefix.payment}: {L.payment[payment as keyof typeof L.payment] ?? payment}</Badge>
      <Badge tone={shipTone(shipping)}>{L.prefix.shipping}: {L.shipping[shipping as keyof typeof L.shipping] ?? shipping}</Badge>
    </span>
  );
}
