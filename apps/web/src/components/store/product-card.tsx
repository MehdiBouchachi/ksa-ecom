import Image from "next/image";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import type { CatalogCard } from "@/server/catalog";
import { btnSecondary, StoreEmpty, TextilePanel } from "./ui";

/**
 * One card = one real colour option of the product family. The colour is the title (cards are
 * distinguishable); the shared product name is secondary. Badges appear only when data supports them.
 */
export function ProductCard({ card, priority = false }: { card: CatalogCard; priority?: boolean }) {
  const href = `/products/${encodeURIComponent(card.productSlug)}?color=${encodeURIComponent(card.colorSlug)}`;
  const soldOut = card.available === 0;
  return (
    <article className="group relative flex h-full flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
        {card.imageUrl ? (
          <Image
            src={card.imageUrl}
            alt={card.imageAlt ?? `${card.productName} — ${card.colorName}`}
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
            priority={priority}
          />
        ) : (
          <TextilePanel hex={card.swatchHex} className="absolute inset-0 transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transition-none" />
        )}
        <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut && <span className="rounded-md bg-card/95 px-2 py-1 text-xs font-semibold text-destructive shadow-sm">نفدت الكمية</span>}
          {!soldOut && card.hasBulk && <span className="rounded-md bg-card/95 px-2 py-1 text-xs font-semibold text-foreground shadow-sm">متاح بالجملة</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col pt-3">
        <h3 className="flex items-center gap-2 text-base font-semibold leading-snug">
          <span className="inline-block size-3.5 shrink-0 rounded-full ring-1 ring-black/15" style={{ background: card.swatchHex }} aria-hidden />
          {/* The link covers the whole card (stretched), keeping one tab stop per card. */}
          <Link href={href} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring/50">
            {card.colorName}
          </Link>
        </h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{card.productName}</p>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <p className="text-[15px]">
            <span className="text-xs text-muted-foreground">من </span>
            <span className="font-bold">{formatSAR(card.minPriceHalalas)}</span>
            {card.maxCompareAtHalalas && card.maxCompareAtHalalas > card.minPriceHalalas ? (
              <s className="ms-1.5 text-xs text-muted-foreground">{formatSAR(card.maxCompareAtHalalas)}</s>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground">{card.sizeCount} {card.sizeCount === 1 ? "مقاس" : card.sizeCount === 2 ? "مقاسان" : "مقاسات"}</p>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, emptyHref = "/products" }: { items: CatalogCard[]; emptyHref?: string }) {
  if (!items.length) {
    return (
      <StoreEmpty
        icon={<SearchX className="size-7" aria-hidden />}
        title="لا توجد نتائج مطابقة"
        body="جرّب إزالة بعض عوامل التصفية أو البحث بكلمة أخرى."
        action={<Link href={emptyHref} className={btnSecondary}>مسح الفلاتر</Link>}
      />
    );
  }
  return (
    <ul className={`grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 ${items.length > 3 ? "xl:grid-cols-4" : ""}`}>
      {items.map((c, i) => (
        <li key={`${c.productId}-${c.colorId}`}>
          <ProductCard card={c} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
