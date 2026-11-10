import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Heart, Trash2 } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import { MoveToCart } from "@/components/account/move-to-cart";
import { btnPrimary, StoreEmpty, TextilePanel } from "@/components/store/ui";
import { getCurrentUser, requireUser } from "@/server/auth/guards";
import { listWishlist, removeFromWishlist } from "@/server/wishlist";

export const metadata: Metadata = { title: "المفضلة", robots: { index: false, follow: false } };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?next=/wishlist");
  const items = await listWishlist(user.id);

  async function remove(id: string) {
    "use server";
    const u = await requireUser(); // ownership enforced again inside removeFromWishlist(user_id = u.id)
    await removeFromWishlist(u.id, id);
    revalidatePath("/wishlist");
  }

  return (
    <>
      <h1 className="text-[28px] font-bold tracking-tight md:text-4xl">المفضلة</h1>
      {items.length > 0 && <p className="mt-2 text-muted-foreground">{items.length} {items.length === 1 ? "خيار محفوظ" : "خيارات محفوظة"}</p>}
      {!items.length ? (
        <StoreEmpty
          icon={<Heart className="size-7" aria-hidden />}
          title="لا توجد عناصر في المفضلة بعد"
          body="احفظ اللون والمقاس الذي يعجبك من صفحة المنتج بالضغط على رمز القلب، لتعود إليه لاحقًا."
          action={<Link href="/products" className={btnPrimary}>تصفح التشكيلات</Link>}
        />
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((i) => {
            const available = Math.max(0, (i.onHand ?? 0) - (i.reserved ?? 0));
            const buyable = i.active && available > 0;
            const label = `${i.productName} — ${i.colorName} / ${i.sizeName}`;
            const href = `/products/${i.productSlug}?color=${i.colorSlug}`;
            return (
              <li key={i.id}>
                <article className="flex h-full flex-col">
                  <Link href={href} className="relative block aspect-[4/5] overflow-hidden rounded-xl" aria-label={label}>
                    <TextilePanel hex={i.swatchHex} className="absolute inset-0" />
                  </Link>
                  <div className="flex flex-1 flex-col pt-3">
                    <h2 className="text-base font-semibold">
                      <Link href={href} className="hover:text-primary">{i.colorName} · مقاس {i.sizeName}</Link>
                    </h2>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{i.productName}</p>
                    <p className="mt-2 flex items-baseline justify-between gap-2">
                      <span className="font-bold">{formatSAR(i.priceHalalas)}</span>
                      <span className={`text-sm ${buyable ? "text-success" : "text-destructive"}`}>{buyable ? "متوفر" : "غير متوفر حاليًا"}</span>
                    </p>
                    <div className="mt-auto flex gap-2 pt-4">
                      {buyable && <MoveToCart variantId={i.variantId} label={label} removeAction={remove.bind(null, i.id)} />}
                      <form action={remove.bind(null, i.id)} className={buyable ? "" : "flex-1"}>
                        <button className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:border-destructive/30 hover:bg-destructive-soft hover:text-destructive" aria-label={`حذف ${label} من المفضلة`}>
                          <Trash2 className="size-4" aria-hidden /> {buyable ? <span className="sr-only">حذف</span> : "حذف"}
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
