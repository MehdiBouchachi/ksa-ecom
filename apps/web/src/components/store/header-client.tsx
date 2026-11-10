"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldCls, iconBtn } from "./ui";

/* Native <dialog>: focus trap, Escape, backdrop and focus return come from the platform. */

export function SearchButton({ label, placeholder, submit }: { label: string; placeholder: string; submit: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  useEffect(() => ref.current?.close(), [pathname]);
  return (
    <>
      <button type="button" className={iconBtn} aria-label={label} title={label} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        <Search className="size-[21px]" aria-hidden />
      </button>
      <dialog ref={ref} className="store-search" aria-label={label} onClick={(e) => e.target === ref.current && ref.current.close()}>
        <form action="/products" role="search" className="flex items-center gap-2 p-3" onSubmit={() => ref.current?.close()}>
          <label htmlFor="site-search" className="sr-only">{label}</label>
          <Search className="ms-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input id="site-search" name="q" type="search" autoFocus placeholder={placeholder} className={cn(fieldCls, "border-0 focus:ring-0")} />
          <button className="min-h-11 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">{submit}</button>
        </form>
      </dialog>
    </>
  );
}

export function MobileNav({ links, label, close, brand, children }: { links: { href: string; label: string }[]; label: string; close: string; brand: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  useEffect(() => ref.current?.close(), [pathname]);
  return (
    <>
      <button type="button" className={cn(iconBtn, "lg:hidden")} aria-label={label} aria-haspopup="dialog" onClick={() => ref.current?.showModal()}>
        <Menu className="size-[22px]" aria-hidden />
      </button>
      <dialog ref={ref} className="store-drawer" aria-label={label} onClick={(e) => e.target === ref.current && ref.current.close()}>
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="font-bold text-primary">{brand}</span>
          <form method="dialog">
            <button className={iconBtn} aria-label={close}>
              <X className="size-5" aria-hidden />
            </button>
          </form>
        </div>
        <nav aria-label={label} className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {links.map((l) => {
              const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link href={l.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center rounded-lg px-3 text-base", active ? "bg-primary-soft font-semibold text-primary" : "hover:bg-muted")}>
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {children && <div className="border-t border-border p-3">{children}</div>}
      </dialog>
    </>
  );
}

/** Desktop nav link with active state. */
export function NavLinks({ links, label }: { links: { href: string; label: string }[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn("relative inline-flex min-h-11 items-center whitespace-nowrap rounded-md px-3 text-[15px] transition-colors hover:text-primary", active ? "font-semibold text-foreground after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-primary" : "text-foreground/75")}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
