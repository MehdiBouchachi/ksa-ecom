import Image from "next/image";
import Link from "next/link";
import type { CatalogCard } from "@/server/catalog";
import { Badge } from "@/components/ui/card";
import { Price } from "./price";

export function ProductCard({ card, priority = false }: { card: CatalogCard; priority?: boolean }) {
  const href = `/products/${encodeURIComponent(card.productSlug)}?color=${encodeURIComponent(card.colorSlug)}`;
  const title = `${card.productName} — ${card.colorName}`;
  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card">
      <Link href={href} className="relative block aspect-[4/5] bg-muted">
        <Image
          src={card.imageUrl ?? "/placeholder.svg"}
          alt={card.imageAlt ?? title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
          priority={priority}
        />
        <div className="absolute start-2 top-2 flex flex-col gap-1">
          {card.available === 0 && <Badge tone="danger">نفدت الكمية</Badge>}
          {card.hasBulk && <Badge tone="info">متاح بالجملة</Badge>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-sm font-semibold leading-snug">
          <Link href={href}>{card.productName}</Link>
        </h3>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block size-4 rounded-full border border-border" style={{ background: card.swatchHex }} aria-hidden />
          {card.colorName} · {card.sizeCount} مقاسات
        </p>
        <Price halalas={card.minPriceHalalas} compareAt={card.maxCompareAtHalalas} className="mt-auto pt-1" />
      </div>
    </article>
  );
}

export function ProductGrid({ items }: { items: CatalogCard[] }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="font-semibold">لا توجد منتجات مطابقة</p>
        <p className="mt-1 text-sm text-muted-foreground">جرّب إزالة بعض عوامل التصفية.</p>
        <Link href="/products" className="mt-4 inline-block font-semibold text-primary underline">
          عرض جميع المنتجات
        </Link>
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((c, i) => (
        <li key={`${c.productId}-${c.colorId}`}>
          <ProductCard card={c} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
