import Link from "next/link";
import { Heart, ShoppingBag, UserRound } from "lucide-react";
import { getCurrentUser, isStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { CartCount } from "@/components/cart/cart-count";
import { t } from "@/i18n/ar";
import { MobileNav, NavLinks, SearchButton } from "./header-client";
import { iconBtn } from "./ui";

export async function Header() {
  const [user, store] = await Promise.all([getCurrentUser().catch(() => null), getSetting("store").catch(() => null)]);
  const brand = store?.name || "المتجر";
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/products", label: t.nav.collections },
    { href: "/about", label: t.nav.about },
    { href: "/faq", label: t.nav.faq },
    { href: "/contact", label: t.nav.contact },
  ];
  const account = user
    ? { href: isStaff(user) ? "/admin" : "/account/orders", label: isStaff(user) ? t.nav.admin : t.nav.account }
    : { href: "/auth/login", label: t.nav.login };

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-store flex h-16 items-center gap-2 lg:h-[72px] lg:gap-6">
        <MobileNav links={links} label={t.nav.menu} close={t.common.close} brand={brand}>
          <Link href="/wishlist" className="flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-muted">
            <Heart className="size-5" aria-hidden /> {t.nav.wishlist}
          </Link>
          <Link href={account.href} className="flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-muted">
            <UserRound className="size-5" aria-hidden /> {account.label}
          </Link>
        </MobileNav>
        <Link href="/" className="min-w-0 truncate text-lg font-bold tracking-tight text-primary md:text-xl">
          {brand}
        </Link>
        <div className="mx-auto hidden lg:block">
          <NavLinks links={links} label={t.nav.main} />
        </div>
        <div className="ms-auto flex items-center lg:ms-0">
          <SearchButton label={t.nav.search} placeholder={t.nav.searchPlaceholder} submit={t.common.search} />
          <Link href="/wishlist" className={`${iconBtn} hidden sm:grid`} aria-label={t.nav.wishlist} title={t.nav.wishlist}>
            <Heart className="size-[21px]" aria-hidden />
          </Link>
          <Link href={account.href} className={`${iconBtn} hidden lg:grid`} aria-label={account.label} title={account.label}>
            <UserRound className="size-[21px]" aria-hidden />
          </Link>
          <Link href="/cart" className={iconBtn} aria-label={t.nav.cart} title={t.nav.cart}>
            <ShoppingBag className="size-[21px]" aria-hidden />
            <CartCount />
          </Link>
        </div>
      </div>
    </header>
  );
}
