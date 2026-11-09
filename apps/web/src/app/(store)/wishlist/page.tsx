import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MoveToCart } from "@/components/account/move-to-cart";
import { Price } from "@/components/store/price";
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
      <h1 className="mb-6 text-2xl font-bold">المفضلة</h1>
      {!items.length ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p>لا توجد عناصر في المفضلة بعد.</p>
          <Link href="/products" className="mt-4 inline-block font-semibold text-primary">تصفح المنتجات</Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {items.map((i) => {
            const available = Math.max(0, (i.onHand ?? 0) - (i.reserved ?? 0));
            const label = `${i.productName} — ${i.colorName} / ${i.sizeName}`;
            return (
              <li key={i.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="inline-block size-6 rounded-full border border-border" style={{ background: i.swatchHex }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${i.productSlug}?color=${i.colorSlug}`} className="font-semibold">{label}</Link>
                  <p className="text-sm text-muted-foreground"><Price halalas={i.priceHalalas} /> · {i.active && available > 0 ? "متوفر" : "غير متوفر حاليًا"}</p>
                </div>
                {i.active && available > 0 && <MoveToCart variantId={i.variantId} label={label} removeAction={remove.bind(null, i.id)} />}
                <form action={remove.bind(null, i.id)}>
                  <button className="min-h-11 rounded-md px-3 text-sm text-destructive hover:bg-red-50">حذف</button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
