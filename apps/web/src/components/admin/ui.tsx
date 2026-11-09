import { CheckCircle2, Inbox, XCircle } from "lucide-react";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";

/** Shared admin UI kit — every admin page uses these, so polish lands everywhere at once. */

export function Flash({ sp }: { sp: { ok?: string; error?: string } }) {
  if (!sp.error && !sp.ok) return null;
  const err = Boolean(sp.error);
  const Icon = err ? XCircle : CheckCircle2;
  return (
    <div
      role={err ? "alert" : "status"}
      className={cn(
        "fade-in mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm",
        err ? "border-red-200 bg-red-50 text-red-900" : "border-green-200 bg-green-50 text-green-900",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{sp.error ?? sp.ok}</p>
    </div>
  );
}

export function PageTitle({ children, actions, description }: { children: React.ReactNode; actions?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Card section with optional header. */
export function Section({ title, actions, children, className, bodyClassName }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40/0.04)]", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export async function Table({ head, children, empty, emptyText, bare, className }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean; emptyText?: string; bare?: boolean; className?: string }) {
  const locale = await getLocale();
  return (
    <div className={cn("overflow-hidden bg-card", className, !bare && "rounded-2xl border border-border shadow-[0_1px_2px_rgb(16_24_40/0.04)]")}>
      {/* relative: keeps absolutely-positioned descendants (e.g. sr-only labels) inside the scroller */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          <thead className="border-b border-border bg-muted/60">
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_tr]:transition-colors [&_tr:hover]:bg-muted/40">{children}</tbody>
        </table>
      </div>
      {empty && (
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-muted-foreground">
          <span className="grid size-11 place-items-center rounded-full bg-muted" aria-hidden>
            <Inbox className="size-5" />
          </span>
          <p className="text-sm">{emptyText ?? (locale === "en" ? "No data yet." : "لا توجد بيانات.")}</p>
        </div>
      )}
    </div>
  );
}

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1";
export const inputCls = cn(
  "min-h-10 w-full min-w-0 max-w-full rounded-lg border border-input bg-card px-3 text-sm shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-stone-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
);
export const btnCls = cn(
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  focus,
);
export const btnOutlineCls = cn(
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-medium shadow-xs transition-[background-color,border-color,transform] duration-150 hover:bg-muted active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  focus,
);
export const btnDangerCls = cn(
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-red-800 transition-colors duration-150 hover:bg-red-100 active:scale-[0.98]",
  focus,
);

export function Field({ label, children, className, hint }: { label: string; children: React.ReactNode; className?: string; hint?: string }) {
  return (
    <label className={cn("block min-w-0 text-sm", className)}>
      <span className="mb-1.5 block font-medium text-foreground/90">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** Confirmation for destructive actions without client JS: required checkbox. */
export function ConfirmBox({ label = "أؤكد هذا الإجراء" }: { label?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" required className="size-4 accent-primary" /> {label}
    </label>
  );
}

/** Active / paused pill with a dot (text + color, never color alone). */
export function StatusPill({ on, labels }: { on: boolean; labels: [string, string] }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", on ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-stone-50 text-stone-600 ring-stone-200")}>
      <span className={cn("size-1.5 rounded-full", on ? "bg-emerald-500" : "bg-stone-400")} aria-hidden />
      {on ? labels[0] : labels[1]}
    </span>
  );
}

/** Checkbox styled as a bordered toggle row. */
export function CheckRow({ name, label, defaultChecked, className }: { name: string; label: string; defaultChecked?: boolean; className?: string }) {
  return (
    <label className={cn("flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 text-sm transition-colors hover:bg-muted", className)}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-primary" /> {label}
    </label>
  );
}
