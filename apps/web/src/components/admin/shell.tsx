"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Boxes,
  ExternalLink,
  FolderTree,
  Languages,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  Package,
  Palette,
  Settings,
  ShoppingBag,
  Tag,
  Tags,
  Truck,
  Users,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/auth/actions";
import { setLocaleAction } from "@/i18n/actions";
import { cn } from "@/lib/utils";

export type NavKey =
  | "dashboard" | "orders" | "shipping" | "products" | "variants" | "pricing" | "inventory"
  | "categories" | "brands" | "collections" | "settings" | "customers" | "team";
export type NavGroup = { label: string; items: { key: NavKey; href: string; label: string }[] };

const ICONS: Record<NavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  shipping: Truck,
  products: Package,
  variants: Palette,
  pricing: Tags,
  inventory: Boxes,
  categories: FolderTree,
  brands: Tag,
  collections: Layers,
  settings: Settings,
  customers: Users,
  team: UserCog,
};

type Strings = { brand: string; viewStore: string; openMenu: string; closeMenu: string; language: string; languageLabel: string; signOut: string };

export function AdminShell({
  locale,
  groups,
  user,
  s,
  children,
}: {
  locale: "ar" | "en";
  groups: NavGroup[];
  user: { name: string; role: string };
  s: Strings;
  children: React.ReactNode;
}) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Keep <html> in sync so native UI (scrollbars, selects, autofill) follows the admin language.
  useEffect(() => {
    const html = document.documentElement;
    const prev = { lang: html.lang, dir: html.dir };
    html.lang = locale;
    html.dir = dir;
    return () => {
      html.lang = prev.lang;
      html.dir = prev.dir;
    };
  }, [locale, dir]);

  // Close the drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  // Drawer: Escape closes, body scroll lock, focus moves into the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-2 px-5">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-foreground">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm text-white" aria-hidden>
            <LayoutDashboard className="size-4" />
          </span>
          {s.brand}
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted md:hidden" aria-label={s.closeMenu}>
          <X className="size-5" />
        </button>
      </div>
      <nav aria-label={s.brand} className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => (
          <div key={g.label} className="mt-4 first:mt-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.href === "/admin" ? pathname === "/admin" : pathname === it.href || pathname.startsWith(it.href + "/");
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150",
                        active ? "bg-accent font-semibold text-primary" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {active && <span aria-hidden className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary" />}
                      <NavItemBody icon={ICONS[it.key]} label={it.label} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary" aria-hidden>
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.role}</p>
          </div>
          <form action={logoutAction}>
            <button className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-destructive" aria-label={s.signOut} title={s.signOut}>
              <LogOut className="size-4 rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div dir={dir} lang={locale} className="min-h-dvh bg-background md:grid md:grid-cols-[256px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh border-e border-border bg-card md:block">{sidebar}</aside>

      {/* Mobile drawer */}
      <div
        className={cn("fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={s.brand}
        inert={!open}
        className={cn(
          "fixed inset-y-0 start-0 z-50 w-[min(18rem,85vw)] bg-card shadow-xl transition-transform duration-200 ease-[var(--ease-out)] md:hidden",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
        )}
      >
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
          <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-md hover:bg-muted md:hidden" aria-label={s.openMenu} aria-expanded={open}>
            <Menu className="size-5" />
          </button>
          <span className="font-bold md:hidden">{s.brand}</span>
          <div className="ms-auto flex items-center gap-1">
            <LanguageToggle next={locale === "ar" ? "en" : "ar"} label={s.language} aria={s.languageLabel} />
            <Link href="/" target="_blank" className="hidden min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex">
              <ExternalLink className="size-4" /> {s.viewStore}
            </Link>
          </div>
        </header>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Lives inside <Link> so it can read that link's pending state. */
function NavItemBody({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && <span className="nav-progress" aria-hidden />}
      <Icon className={cn("size-[18px] shrink-0 transition-opacity", pending && "opacity-50")} aria-hidden />
      <span className="truncate">{label}</span>
    </>
  );
}

function LanguageToggle({ next, label, aria }: { next: "ar" | "en"; label: string; aria: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await setLocaleAction(next);
          router.refresh();
        })
      }
      disabled={pending}
      aria-label={aria}
      lang={next}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
    >
      <Languages className="size-4" aria-hidden /> {label}
    </button>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
