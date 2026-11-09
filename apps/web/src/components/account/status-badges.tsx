import { CreditCard, Package, Truck, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { statusLabels } from "@/i18n/admin";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";
const orderTone = (s: string): Tone => (["CANCELLED", "RETURNED"].includes(s) ? "danger" : s === "REQUIRES_RECONCILIATION" || s === "PENDING" ? "warning" : s === "DELIVERED" ? "success" : "info");
const payTone = (s: string): Tone => (s === "PAID" ? "success" : s === "FAILED" ? "danger" : s === "REFUNDED" ? "neutral" : "warning");
const shipTone = (s: string): Tone => (s === "DELIVERED" ? "success" : s === "FAILED" || s === "RETURNED" ? "danger" : s === "NOT_CREATED" ? "neutral" : "info");

const dot: Record<Tone, string> = {
  neutral: "bg-stone-50 text-stone-600 ring-stone-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
};

function Chip({ icon: Icon, tone, prefix, label }: { icon: LucideIcon; tone: Tone; prefix: string; label: string }) {
  return (
    <span title={`${prefix}: ${label}`} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${dot[tone]}`}>
      <Icon className="size-3.5 shrink-0 opacity-80" aria-hidden />
      <span className="sr-only">{prefix}: </span>
      {label}
    </span>
  );
}

/**
 * Three independent state machines, shown side by side (ACC-14).
 * `compact` (admin lists): icon chips — the visible prefix is replaced by an icon (prefix kept for screen readers / tooltip).
 */
export function StatusBadges({ order, payment, shipping, locale = "ar", compact = false }: { order: string; payment: string; shipping?: string; locale?: "ar" | "en"; compact?: boolean }) {
  const L = statusLabels(locale);
  const o = L.order[order as keyof typeof L.order] ?? order;
  const p = L.payment[payment as keyof typeof L.payment] ?? payment;
  const sh = shipping ? (L.shipping[shipping as keyof typeof L.shipping] ?? shipping) : null;
  if (compact) {
    return (
      <span className="flex flex-wrap gap-1">
        <Chip icon={Package} tone={orderTone(order)} prefix={L.prefix.order} label={o} />
        <Chip icon={CreditCard} tone={payTone(payment)} prefix={L.prefix.payment} label={p} />
        {shipping && sh && <Chip icon={Truck} tone={shipTone(shipping)} prefix={L.prefix.shipping} label={sh} />}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1">
      <Badge tone={orderTone(order)}>{L.prefix.order}: {o}</Badge>
      <Badge tone={payTone(payment)}>{L.prefix.payment}: {p}</Badge>
      {shipping && <Badge tone={shipTone(shipping)}>{L.prefix.shipping}: {sh}</Badge>}
    </span>
  );
}
