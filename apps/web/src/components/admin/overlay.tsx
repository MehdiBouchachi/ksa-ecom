"use client";

import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/*
 * Admin overlays on the native <dialog> element: focus is trapped and Escape closes it.
 * Focus goes back to the trigger when it closes. Forms inside stay plain server-action forms.
 * After a server action redirects (?ok= / ?error= changes), the overlay closes and the page
 * shows the Flash message, so feedback is visible and nothing is resubmitted.
 */

export function SubmitButton({ children, className, pendingLabel, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...p} disabled={pending || p.disabled} aria-disabled={pending || p.disabled} className={className}>
      {pending && <span className="size-3.5 animate-spin rounded-full border-2 border-current border-e-transparent" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

type OverlayProps = {
  /** Trigger button content (text and/or icon). */
  trigger: React.ReactNode;
  triggerClassName?: string;
  /** Accessible label for icon-only triggers. */
  triggerLabel?: string;
  title: string;
  description?: React.ReactNode;
  closeLabel: string;
  /** "sheet" = side drawer (forms); "modal" = small centered dialog (confirmations). */
  kind?: "sheet" | "modal";
  /** Open on first render (e.g. ?new=1 deep links). */
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function Overlay({ trigger, triggerClassName, triggerLabel, title, description, closeLabel, kind = "sheet", defaultOpen, children }: OverlayProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const sp = useSearchParams();
  const feedback = `${sp.get("ok") ?? ""}|${sp.get("error") ?? ""}`;
  const first = useRef(true);

  useEffect(() => {
    if (defaultOpen) ref.current?.showModal();
  }, [defaultOpen]);
  // Close after a server action round-trip (the redirect changes ?ok / ?error).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.close();
  }, [feedback]);

  return (
    <>
      <button type="button" className={triggerClassName} aria-label={triggerLabel} title={triggerLabel} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        className={kind === "sheet" ? "admin-sheet" : "admin-modal"}
        onClick={(e) => {
          if (e.target === ref.current) ref.current.close(); // backdrop click
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">{title}</h2>
            {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
          </div>
          <form method="dialog">
            <button className="-m-1.5 grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={closeLabel} title={closeLabel}>
              <X className="size-4" aria-hidden />
            </button>
          </form>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-5", kind === "sheet" ? "py-5" : "py-4")}>{children}</div>
      </dialog>
    </>
  );
}

/** Sticky footer for forms inside an Overlay: Cancel + primary submit. */
export function OverlayFooter({ cancelLabel, children }: { cancelLabel: string; children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-5 py-3">
      <button
        type="button"
        onClick={(e) => (e.currentTarget.closest("dialog") as HTMLDialogElement | null)?.close()}
        className="inline-flex min-h-10 items-center rounded-md border border-input bg-card px-4 text-sm font-medium hover:bg-muted"
      >
        {cancelLabel}
      </button>
      {children}
    </div>
  );
}
