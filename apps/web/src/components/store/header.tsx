import Link from "next/link";
import { getCurrentUser, isStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { CartCount } from "@/components/cart/cart-count";
import { t } from "@/i18n/ar";
import { CartIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./icons";

export async function Header() {
  const [user, store] = await Promise.all([getCurrentUser().catch(() => null), getSetting("store").catch(() => null)]);
  const links = [
    { href: "/products", label: t.nav.products },
    { href: "/about", label: t.nav.about },
    { href: "/faq", label: t.nav.faq },
    { href: "/contact", label: t.nav.contact },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <details className="relative md:hidden">
          <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-md hover:bg-muted" aria-label="القائمة">
            <MenuIcon />
          </summary>
          <nav aria-label="القائمة الرئيسية" className="absolute start-0 top-12 w-56 rounded-md border border-border bg-card p-2 shadow-lg">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="block rounded px-3 py-2.5 hover:bg-muted">
                {l.label}
              </Link>
            ))}
          </nav>
        </details>
        <Link href="/" className="text-lg font-bold text-primary">
          {store?.name ?? "المتجر"}
        </Link>
        <nav aria-label="القائمة الرئيسية" className="ms-4 hidden gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded px-3 py-2 text-sm hover:bg-muted">
              {l.label}
            </Link>
          ))}
        </nav>
        <form action="/products" role="search" className="ms-auto hidden max-w-xs flex-1 sm:flex">
          <label htmlFor="site-search" className="sr-only">
            ابحث عن منتج
          </label>
          <input id="site-search" name="q" type="search" placeholder="ابحث عن منتج…" className="min-h-10 w-full rounded-s-md border border-input bg-card px-3 text-sm" />
          <button type="submit" className="flex min-h-10 items-center rounded-e-md border border-s-0 border-input bg-muted px-3" aria-label={t.common.search}>
            <SearchIcon />
          </button>
        </form>
        <div className="ms-auto flex items-center gap-1 sm:ms-2">
          <Link href="/wishlist" className="flex size-11 items-center justify-center rounded-md hover:bg-muted" aria-label={t.nav.wishlist}>
            <HeartIcon />
          </Link>
          <Link href="/cart" className="relative flex size-11 items-center justify-center rounded-md hover:bg-muted" aria-label={t.nav.cart}>
            <CartIcon />
            <CartCount />
          </Link>
          {user ? (
            <Link href={isStaff(user) ? "/admin" : "/account/orders"} className="flex size-11 items-center justify-center rounded-md hover:bg-muted" aria-label={isStaff(user) ? t.nav.admin : t.nav.account}>
              <UserIcon />
            </Link>
          ) : (
            <Link href="/auth/login" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
              {t.nav.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
