import { CheckCircle2, ChevronLeft, ChevronRight, Inbox, Info, TriangleAlert, XCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { formatSAR } from "@saudi-ecom/contracts";
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
        err ? "border-destructive/25 bg-destructive-soft text-destructive" : "border-success/25 bg-success-soft text-success",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{sp.error ?? sp.ok}</p>
    </div>
  );
}

/** Page header: title + one-line purpose + (at most) one primary action and quiet secondary actions. */
export function AdminPageHeader({ title, description, primary, secondary }: { title: React.ReactNode; description?: React.ReactNode; primary?: React.ReactNode; secondary?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-64">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {(primary || secondary) && (
        <div className="flex flex-wrap items-center gap-2">
          {secondary}
          {primary}
        </div>
      )}
    </header>
  );
}

/** Back-compat wrapper (older pages). */
export function PageTitle({ children, actions, description }: { children: React.ReactNode; actions?: React.ReactNode; description?: React.ReactNode }) {
  return <AdminPageHeader title={children} description={description} primary={actions} />;
}

/** Card section with optional header. */
export function Section({ title, actions, children, className, bodyClassName }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card", className)}>
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

export async function Table({ head, children, caption, empty, emptyText, bare, className }: { head: React.ReactNode[]; children: React.ReactNode; caption?: string; empty?: boolean; emptyText?: string; bare?: boolean; className?: string }) {
  const locale = await getLocale();
  return (
    <div className={cn("overflow-hidden bg-card", className, !bare && "rounded-lg border border-border")}>
      {/* relative: keeps absolutely-positioned descendants (e.g. sr-only labels) inside the scroller */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-160 text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="border-b border-border bg-surface-muted/60">
            <tr>
              {head.map((h, i) => (
                <th key={i} scope="col" className="whitespace-nowrap px-4 py-3 text-start text-xs font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle [&_tr]:transition-colors [&_tr:hover]:bg-muted/50 [&_tr:focus-within]:bg-accent/70">{children}</tbody>
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
  "min-h-10 w-full min-w-0 max-w-full rounded-md border border-input bg-card px-3 text-sm transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60",
);
export const btnCls = cn(
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50",
  focus,
);
export const btnOutlineCls = cn(
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-input bg-card px-3.5 text-sm font-medium transition-[background-color,border-color] duration-150 hover:border-border-strong hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
  focus,
);
export const btnDangerCls = cn(
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-destructive px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50",
  focus,
);

export function Field({ label, children, className, hint, required }: { label: string; children: React.ReactNode; className?: string; hint?: string; required?: boolean }) {
  return (
    <label className={cn("block min-w-0 text-sm", className)}>
      <span className="mb-1.5 block font-medium text-foreground/90">
        {label}
        {required && <span className="ms-0.5 text-destructive" aria-hidden>*</span>}
      </span>
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
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", on ? "bg-success-soft text-success ring-success/20" : "bg-surface-muted text-muted-foreground ring-border")}>
      <span className={cn("size-1.5 rounded-full", on ? "bg-success" : "bg-muted-foreground/60")} aria-hidden />
      {on ? labels[0] : labels[1]}
    </span>
  );
}

/** Checkbox styled as a bordered toggle row. */
export function CheckRow({ name, label, defaultChecked, className, value }: { name: string; label: string; defaultChecked?: boolean; className?: string; value?: string }) {
  return (
    <label className={cn("flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 text-sm transition-colors hover:bg-muted", className)}>
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="size-4 accent-primary" /> {label}
    </label>
  );
}

export const btnGhostCls = cn(
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-medium text-foreground/80 transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
  focus,
);
/** Square icon-only row action (always paired with aria-label + title). */
export const iconBtnCls = cn(
  "inline-grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
  focus,
);

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";
const TONE: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted-foreground ring-border",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  danger: "bg-destructive-soft text-destructive ring-destructive/20",
  info: "bg-info-soft text-foreground/80 ring-border",
  primary: "bg-primary-soft text-primary ring-primary/20",
};
const DOT: Record<Tone, string> = { neutral: "bg-muted-foreground/60", success: "bg-success", warning: "bg-warning", danger: "bg-destructive", info: "bg-foreground/50", primary: "bg-primary" };

/** Status label: text + tone (never colour alone). */
export function StatusBadge({ tone = "neutral", children, dot = true, className }: { tone?: Tone; children: React.ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[tone], className)}>
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/** Neutral or semantic notice. */
export function Callout({ tone = "info", title, children, className }: { tone?: "info" | "warning" | "danger"; title?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const Icon = tone === "info" ? Info : TriangleAlert;
  return (
    <div className={cn("flex gap-2.5 rounded-lg border px-4 py-3 text-sm", tone === "info" ? "border-border bg-surface-muted" : tone === "warning" ? "border-warning/25 bg-warning-soft" : "border-destructive/25 bg-destructive-soft", className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", tone === "info" ? "text-muted-foreground" : tone === "warning" ? "text-warning" : "text-destructive")} aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <div className={cn(title ? "mt-0.5 text-muted-foreground" : undefined)}>{children}</div>
      </div>
    </div>
  );
}

/** Honest empty state with an optional next step. */
export function EmptyState({ icon: Icon = Inbox, title, children, action, className }: { icon?: LucideIcon; title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong bg-card px-6 py-12 text-center", className)}>
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Groups fields inside a form with a small heading. */
export function FormSection({ title, description, children, className, cols = 2 }: { title: string; description?: React.ReactNode; children: React.ReactNode; className?: string; cols?: 1 | 2 }) {
  return (
    <section className={cn("min-w-0 border-t border-border pt-5 first-of-type:border-t-0 first-of-type:pt-0", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className={cn("mt-3 grid grid-cols-1 gap-4", cols === 2 && "sm:grid-cols-2")}>{children}</div>
    </section>
  );
}

/** GET filter toolbar: state lives in the URL. */
export function FilterBar({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <form method="get" role="search" aria-label={label} className={cn("mb-4 flex flex-wrap items-end gap-2", className)}>
      {children}
    </form>
  );
}

export function Money({ halalas, locale, className }: { halalas: number; locale: "ar" | "en"; className?: string }) {
  return <span className={cn("tabular whitespace-nowrap", className)}>{formatSAR(halalas, locale)}</span>;
}

/** Compact inline summary strip (replaces rows of KPI cards on operational pages). */
export function StatStrip({ items, className }: { items: { label: string; value: React.ReactNode; tone?: Tone; href?: string }[]; className?: string }) {
  return (
    <dl className={cn("mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:flex", className)}>
      {items.map((it) => {
        const body = (
          <>
            <dt className="text-xs text-muted-foreground">{it.label}</dt>
            <dd className={cn("tabular mt-0.5 text-lg font-semibold", it.tone === "danger" && "text-destructive", it.tone === "warning" && "text-warning")}>{it.value}</dd>
          </>
        );
        return it.href ? (
          <Link key={it.label} href={it.href} className="min-w-0 flex-1 bg-card px-4 py-3 hover:bg-muted">{body}</Link>
        ) : (
          <div key={it.label} className="min-w-0 flex-1 bg-card px-4 py-3">{body}</div>
        );
      })}
    </dl>
  );
}

/** Prev / next pagination that keeps the current query string. */
export function Pagination({ page, pageSize, total, hrefFor, labels }: { page: number; pageSize: number; total: number; hrefFor: (p: number) => string; labels: { prev: string; next: string; showing: (a: number, b: number, n: number) => string; nav: string } }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const a = (page - 1) * pageSize + 1;
  const b = Math.min(total, page * pageSize);
  const linkCls = (disabled: boolean) => cn(btnOutlineCls, "min-h-9 px-2.5", disabled && "pointer-events-none opacity-40");
  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm" aria-label={labels.nav}>
      <p className="tabular text-muted-foreground">{labels.showing(a, b, total)}</p>
      {pages > 1 && (
        <div className="flex gap-2">
          <Link href={hrefFor(page - 1)} aria-disabled={page <= 1} tabIndex={page <= 1 ? -1 : undefined} className={linkCls(page <= 1)}>
            <ChevronRight className="size-4 ltr:hidden" aria-hidden />
            <ChevronLeft className="size-4 rtl:hidden" aria-hidden />
            {labels.prev}
          </Link>
          <Link href={hrefFor(page + 1)} aria-disabled={page >= pages} tabIndex={page >= pages ? -1 : undefined} className={linkCls(page >= pages)}>
            {labels.next}
            <ChevronLeft className="size-4 ltr:hidden" aria-hidden />
            <ChevronRight className="size-4 rtl:hidden" aria-hidden />
          </Link>
        </div>
      )}
    </nav>
  );
}

export const Swatch = ({ hex, className }: { hex: string; className?: string }) => (
  <span className={cn("inline-block size-3.5 shrink-0 rounded-full ring-1 ring-black/15", className)} style={{ background: hex }} aria-hidden />
);

/** Builds an href that keeps the current filters and overrides some keys. */
export function withParams(base: string, current: Record<string, string | undefined>, over: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...over })) {
    if (k === "ok" || k === "error") continue;
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}

/** Underline tab navigation backed by URLs (bookmarkable, works without JS). */
export function TabNav({ label, items }: { label: string; items: { href: string; label: string; active: boolean; count?: number; tone?: Tone }[] }) {
  return (
    <nav aria-label={label} className="mb-5 overflow-x-auto border-b border-border">
      <ul className="flex min-w-max gap-1">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={it.active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm transition-colors",
                it.active ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground hover:border-border-strong hover:text-foreground",
              )}
            >
              {it.label}
              {it.count !== undefined && <span className={cn("tabular rounded-full px-1.5 text-xs", it.count && it.tone === "warning" ? "bg-warning-soft text-warning" : "bg-surface-muted text-muted-foreground")}>{it.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
