"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  Boxes,
  ChevronDown,
  ExternalLink,
  FolderTree,
  Languages,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
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
/** `collapsible` groups fold away (they open automatically when they contain the current page). */
export type NavGroup = { label: string; collapsible?: boolean; items: { key: NavKey; href: string; label: string }[] };

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

type Strings = { brand: string; viewStore: string; openMenu: string; closeMenu: string; language: string; languageLabel: string; signOut: string; collapse: string; expand: string };

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
  // The drawer remembers the path it was opened on, so it closes by itself on navigation.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  const drawerRef = useRef<HTMLDivElement>(null);
  // Desktop icon-rail mode, remembered per browser (a convenience only; server render = expanded).
  const rail = useSyncExternalStore(subscribeRail, readRail, () => false);
  const toggleRail = () => writeRail(!rail);
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));
  const [unfolded, setUnfolded] = useState<Record<string, boolean>>({});
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => {
    setOpenOn(null);
    menuButtonRef.current?.focus();
  }, []);

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

  // Drawer: Escape closes, body scroll lock, focus moves into the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
      }
      if (e.key === "Tab" && drawerRef.current) {
        const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a, button:not(:disabled)'));
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, closeDrawer]);

  const renderSidebar = (railMode: boolean) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("admin-sidebar-brand flex h-14 shrink-0 items-center justify-between gap-2", railMode ? "justify-center px-2" : "px-4")}>
        <Link href="/admin" className="flex items-center gap-3 rounded-lg font-semibold text-foreground hover:text-primary" aria-label={railMode ? s.brand : undefined}>
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground" aria-hidden>
            <LayoutDashboard className="size-4" />
          </span>
          {!railMode && <span className="text-[14px] leading-tight">{s.brand}</span>}
        </Link>
        <button type="button" onClick={closeDrawer} className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden" aria-label={s.closeMenu}>
          <X className="size-5" />
        </button>
      </div>
      <nav aria-label={s.brand} className={cn("admin-nav-scroll min-h-0 flex-1 overflow-y-auto py-2", railMode ? "px-2" : "px-3")}>
        {groups.map((g) => {
          const hasActive = g.items.some((it) => isActive(it.href));
          const folded = g.collapsible && !(unfolded[g.label] ?? hasActive);
          const listId = `nav-${g.label}`;
          return (
            <div key={g.label} className="mt-2 pt-1 first:mt-0 first:pt-0">
              {g.collapsible && !railMode ? (
                <button
                  type="button"
                  onClick={() => setUnfolded((u) => ({ ...u, [g.label]: Boolean(folded) }))}
                  aria-expanded={!folded}
                  aria-controls={listId}
                  className="flex w-full items-center justify-between rounded-md px-3 pb-1 pt-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  {g.label}
                  <ChevronDown className={cn("size-3.5 transition-transform", folded && "ltr:-rotate-90 rtl:rotate-90")} aria-hidden />
                </button>
              ) : (
                <p className={cn("px-3 pb-1 text-[11px] font-medium text-muted-foreground", railMode && "sr-only")}>{g.label}</p>
              )}
              <ul id={listId} className={cn("space-y-0.5", folded && !railMode && "hidden")}>
                {g.items.map((it) => {
                  const active = isActive(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        aria-current={active ? "page" : undefined}
                        title={railMode ? it.label : undefined}
                        className={cn(
                          "group relative flex min-h-9 items-center gap-3 rounded-md px-3 text-[13px] transition-colors duration-150 focus-visible:outline-primary",
                          railMode && "justify-center px-0",
                          active
                            ? "bg-card font-semibold text-foreground ring-1 ring-inset ring-border before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:rounded-full before:bg-primary"
                            : "text-muted-foreground hover:bg-border/60 hover:text-foreground",
                        )}
                      >
                        <NavItemBody icon={ICONS[it.key]} label={it.label} hideLabel={railMode} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-border p-3">
        <div className={cn("flex items-center gap-3 rounded-lg py-1.5", railMode ? "flex-col px-0" : "px-2")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-card text-sm font-bold text-primary" aria-hidden title={railMode ? `${user.name} — ${user.role}` : undefined}>
            {initials(user.name)}
          </span>
          {!railMode && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
          )}
          <form action={logoutAction}>
            <button className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive" aria-label={s.signOut} title={s.signOut}>
              <LogOut className="size-4 rtl:-scale-x-100" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div dir={dir} lang={locale} className={cn("admin-theme h-dvh overflow-hidden bg-background text-foreground md:grid", rail ? "md:grid-cols-[64px_minmax(0,1fr)]" : "md:grid-cols-[232px_minmax(0,1fr)]")}>
      {/* Desktop sidebar */}
      <aside className={cn("admin-sidebar fixed inset-y-0 start-0 z-40 hidden h-dvh md:block", rail ? "w-16" : "w-[232px]")}>{renderSidebar(rail)}</aside>

      {/* Mobile drawer */}
      <div
        className={cn("fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
        onClick={closeDrawer}
        aria-hidden
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={s.brand}
        inert={!open}
        className={cn(
          "admin-sidebar fixed inset-y-0 start-0 z-50 w-[min(18rem,85vw)] shadow-2xl transition-transform duration-200 ease-(--ease-out) md:hidden",
          open ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full",
        )}
      >
        {renderSidebar(false)}
      </div>

      <div className="flex h-dvh min-h-0 min-w-0 flex-col md:col-start-2">
        <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-4 md:px-6">
          <button ref={menuButtonRef} type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-md hover:bg-muted md:hidden" aria-label={s.openMenu} aria-expanded={open}>
            <Menu className="size-5" />
          </button>
          <span className="font-bold md:hidden">{s.brand}</span>
          <button type="button" onClick={toggleRail} className="hidden size-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:grid" aria-label={rail ? s.expand : s.collapse} title={rail ? s.expand : s.collapse} aria-pressed={rail}>
            {rail ? <PanelLeftOpen className="size-[18px] rtl:-scale-x-100" aria-hidden /> : <PanelLeftClose className="size-[18px] rtl:-scale-x-100" aria-hidden />}
          </button>
          <div className="ms-auto flex items-center gap-1">
            <LanguageToggle next={locale === "ar" ? "en" : "ar"} label={s.language} aria={s.languageLabel} />
            <Link href="/" target="_blank" className="hidden min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex">
              <ExternalLink className="size-4" /> {s.viewStore}
            </Link>
          </div>
        </header>
        <main id="main" className="admin-page-scroll min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-7">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Lives inside <Link> so it can read that link's pending state. */
function NavItemBody({ icon: Icon, label, hideLabel }: { icon: LucideIcon; label: string; hideLabel?: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && <span className="nav-progress" aria-hidden />}
      <Icon className={cn("size-[18px] shrink-0 transition-opacity", pending && "opacity-50")} aria-hidden />
      <span className={hideLabel ? "sr-only" : "truncate"}>{label}</span>
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

const RAIL_KEY = "admin-rail";
function subscribeRail(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(RAIL_KEY, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(RAIL_KEY, cb);
  };
}
function readRail() {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}
function writeRail(v: boolean) {
  try {
    localStorage.setItem(RAIL_KEY, v ? "1" : "0");
  } catch {
    /* storage unavailable: the toggle simply won't persist */
  }
  window.dispatchEvent(new Event(RAIL_KEY));
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
