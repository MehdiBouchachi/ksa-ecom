import Link from "next/link";
import { cn } from "@/lib/utils";

/** Shared storefront primitives — tokens only, no ad-hoc colours. */

const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const btnPrimary = cn(
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50",
  focus,
);
export const btnSecondary = cn(
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border-strong bg-card px-6 text-[15px] font-semibold text-foreground transition-colors duration-150 hover:border-foreground/30 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
  focus,
);
export const btnText = cn("inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline", focus);
export const iconBtn = cn("relative grid size-11 shrink-0 place-items-center rounded-lg text-foreground/80 transition-colors hover:bg-muted hover:text-foreground", focus);
export const fieldCls = "min-h-12 w-full rounded-lg border border-input bg-card px-3.5 text-base placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 sm:text-sm";

/**
 * Intentional no-photo state: a woven-cloth texture in the variant's real colour.
 * Used only where the merchant has not uploaded an image — never a fake product photo.
 */
export function TextilePanel({ hex, label, className, children }: { hex: string; label?: string; className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn("textile overflow-hidden", className)}
      style={{ "--swatch": hex } as React.CSSProperties}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </div>
  );
}

export function Swatch({ hex, className }: { hex: string; className?: string }) {
  return <span className={cn("inline-block size-4 shrink-0 rounded-full ring-1 ring-black/15", className)} style={{ background: hex }} aria-hidden />;
}

export function SectionHeading({ id, eyebrow, title, description, action }: { id: string; eyebrow?: string; title: string; description?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 md:mb-8">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-1.5 text-sm font-semibold text-sand">{eyebrow}</p>}
        <h2 id={id} className="text-2xl font-bold leading-tight tracking-tight md:text-[32px]">{title}</h2>
        {description && <p className="mt-2 text-[15px] leading-7 text-muted-foreground md:text-base">{description}</p>}
      </div>
      {action && (
        <Link href={action.href} className={btnText}>
          {action.label}
          <span aria-hidden className="rtl:rotate-180">→</span>
        </Link>
      )}
    </div>
  );
}

/** Honest empty state for customer pages (no fake items, no cartoon). */
export function StoreEmpty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center md:py-20">
      <span className="grid size-16 place-items-center rounded-full bg-muted text-primary" aria-hidden>{icon}</span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      {body && <p className="mt-2 leading-7 text-muted-foreground">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
