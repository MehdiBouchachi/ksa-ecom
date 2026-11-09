import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { JsonLd } from "@/components/store/json-ld";
import { ProductGrid } from "@/components/store/product-card";
import { VariantPicker } from "@/components/store/variant-picker";
import { siteUrl } from "@/lib/site";
import { getProductDetail, getRecommendations } from "@/server/catalog";
import { getSettings } from "@/server/lib/settings";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ color?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const d = await getProductDetail(decodeURIComponent((await params).slug));
  if (!d) return {};
  const p = d.product;
  const img = d.media.find((m) => m.kind === "IMAGE");
  const color = (await searchParams).color;
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? (p.description.slice(0, 160) || undefined),
    // ?color=… variants canonicalize to the product URL.
    alternates: { canonical: `/products/${p.slug}` },
    ...(color ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: p.name, images: img ? [{ url: img.url, alt: img.alt }] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const d = await getProductDetail(decodeURIComponent((await params).slug));
  if (!d) notFound();
  const { product: p } = d;
  const colorSlug = (await searchParams).color;
  const initialColor = d.colors.find((c) => c.slug === colorSlug)?.id ?? d.colors[0]?.id ?? null;
  const [recs, settings] = await Promise.all([getRecommendations(p.id, initialColor), getSettings()]);
  const media = [...d.media].sort((a, b) => Number(b.colorId === initialColor) - Number(a.colorId === initialColor));
  const images = media.length ? media : [{ id: "ph", kind: "IMAGE" as const, url: "/placeholder.svg", alt: p.name, colorId: null, width: 800, height: 1000 }];
  const prices = d.variants.map((v) => v.retailPriceHalalas);
  const inStock = d.variants.some((v) => v.available > 0);
  const url = `${siteUrl}/products/${p.slug}`;

  return (
    <>
      <Breadcrumbs items={[{ name: "المنتجات", href: "/products" }, { name: p.name, href: `/products/${p.slug}` }]} />
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <section aria-label="صور المنتج" className="grid grid-cols-2 gap-2">
          {images.slice(0, 6).map((m, i) =>
            m.kind === "VIDEO" ? (
              <video key={m.id} src={m.url} controls preload="none" className="col-span-2 w-full rounded-lg bg-muted" aria-label={m.alt} />
            ) : (
              <div key={m.id} className={`relative aspect-[4/5] overflow-hidden rounded-lg bg-muted ${i === 0 ? "col-span-2" : ""}`}>
                <Image src={m.url} alt={m.alt} fill priority={i === 0} sizes={i === 0 ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"} className="object-cover" />
              </div>
            ),
          )}
        </section>
        <section aria-labelledby="pname">
          <h1 id="pname" className="text-2xl font-bold">{p.name}</h1>
          {d.brands[0] && <p className="mt-1 text-sm text-muted-foreground">{d.brands[0].name}</p>}
          {p.description && <p className="mt-4 whitespace-pre-line text-muted-foreground">{p.description}</p>}
          <div className="mt-6">
            <VariantPicker productName={p.name} variants={d.variants} colors={d.colors} sizes={d.sizes} initialColorId={initialColor} lowStockThreshold={settings.commerce.lowStockThreshold} />
          </div>
          {p.specs.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">المواصفات</h2>
              <dl className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
                {p.specs.map((s) => (
                  <div key={s.label} className="grid grid-cols-3 gap-2 px-4 py-2 text-sm">
                    <dt className="text-muted-foreground">{s.label}</dt>
                    <dd className="col-span-2">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </section>
      </div>
      {recs.length > 0 && (
        <section className="mt-12" aria-labelledby="recs">
          <h2 id="recs" className="mb-4 text-xl font-bold">خيارات أخرى قد تعجبك</h2>
          <ProductGrid items={recs} />
        </section>
      )}
      {prices.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.name,
            description: p.description || undefined,
            image: d.media.filter((m) => m.kind === "IMAGE").map((m) => (m.url.startsWith("http") ? m.url : `${siteUrl}${m.url}`)),
            sku: d.variants[0]?.sku,
            brand: d.brands[0] ? { "@type": "Brand", name: d.brands[0].name } : undefined,
            url,
            // Truthful: real min/max variant prices in SAR and real availability.
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "SAR",
              lowPrice: (Math.min(...prices) / 100).toFixed(2),
              highPrice: (Math.max(...prices) / 100).toFixed(2),
              offerCount: d.variants.length,
              availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          }}
        />
      )}
    </>
  );
}
