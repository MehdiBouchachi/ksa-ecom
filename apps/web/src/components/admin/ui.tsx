import { Alert } from "@/components/ui/card";

export function Flash({ sp }: { sp: { ok?: string; error?: string } }) {
  if (sp.error) return <Alert tone="danger" className="mb-4">{sp.error}</Alert>;
  if (sp.ok) return <Alert tone="success" className="mb-4">{sp.ok}</Alert>;
  return null;
}

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-bold">{children}</h1>
      {actions}
    </div>
  );
}

export function Table({ head, children, empty }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted">
          <tr>{head.map((h, i) => <th key={i} className="p-3 text-start font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="[&_td]:border-t [&_td]:border-border [&_td]:p-3">{children}</tbody>
      </table>
      {empty && <p className="p-6 text-center text-muted-foreground">لا توجد بيانات.</p>}
    </div>
  );
}

export const inputCls = "min-h-10 w-full rounded-md border border-input bg-card px-2 text-sm";
export const btnCls = "min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white";
export const btnOutlineCls = "min-h-10 rounded-md border border-input px-3 text-sm";

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block font-medium">{label}</span>
      {children}
    </label>
  );
}

/** Confirmation for destructive actions without client JS: required checkbox. */
export function ConfirmBox({ label = "أؤكد هذا الإجراء" }: { label?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" required className="size-4" /> {label}
    </label>
  );
}
