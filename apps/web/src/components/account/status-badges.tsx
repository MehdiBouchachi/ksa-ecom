import type { OrderStatus, PaymentStatus, ShipmentStatus } from "@saudi-ecom/contracts";
import { Badge } from "@/components/ui/card";
import { orderStatusLabel, paymentStatusLabel, shipmentStatusLabel } from "@/i18n/ar";

const orderTone = (s: string) => (["CANCELLED", "RETURNED"].includes(s) ? "danger" : s === "REQUIRES_RECONCILIATION" || s === "PENDING" ? "warning" : s === "DELIVERED" ? "success" : "info");
const payTone = (s: string) => (s === "PAID" ? "success" : s === "FAILED" ? "danger" : s === "REFUNDED" ? "neutral" : "warning");
const shipTone = (s: string) => (s === "DELIVERED" ? "success" : s === "FAILED" || s === "RETURNED" ? "danger" : s === "NOT_CREATED" ? "neutral" : "info");

/** Three independent state machines, shown side by side (ACC-14). */
export function StatusBadges({ order, payment, shipping }: { order: string; payment: string; shipping: string }) {
  return (
    <span className="flex flex-wrap gap-1">
      <Badge tone={orderTone(order)}>الطلب: {orderStatusLabel[order as OrderStatus] ?? order}</Badge>
      <Badge tone={payTone(payment)}>الدفع: {paymentStatusLabel[payment as PaymentStatus] ?? payment}</Badge>
      <Badge tone={shipTone(shipping)}>الشحن: {shipmentStatusLabel[shipping as ShipmentStatus] ?? shipping}</Badge>
    </span>
  );
}
