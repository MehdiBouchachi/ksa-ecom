import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { JsonLd } from "@/components/store/json-ld";
import { ProductGrid } from "@/components/store/product-card";
import { SectionHeading } from "@/components/store/ui";
import { ProductView } from "@/components/store/variant-picker";
import { siteUrl } from "@/lib/site";
import { getProductDetail, getRecommendations } from "@/server/catalog";
import { getSettings } from "@/server/lib/settings";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ color?: string; mode?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const d = await getProductDetail(decodeURIComponent((await params).slug));
  if (!d) return {};
  const p = d.product;
  const img = d.media.find((m) => m.kind === "IMAGE");
  const sp = await searchParams;
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? (p.description.slice(0, 160) || undefined),
    // ?color= / ?mode= variants canonicalize to the product URL.
    alternates: { canonical: `/products/${p.slug}` },
    ...(sp.color || sp.mode ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: p.name, images: img ? [{ url: img.url, alt: img.alt }] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const d = await getProductDetail(decodeURIComponent((await params).slug));
  if (!d) notFound();
  const { product: p } = d;
  const sp = await searchParams;
  const initialColor = d.colors.find((c) => c.slug === sp.color)?.id ?? d.colors[0]?.id ?? null;
  const [recs, settings] = await Promise.all([getRecommendations(p.id, initialColor), getSettings()]);
  const prices = d.variants.map((v) => v.retailPriceHalalas);
  const inStock = d.variants.some((v) => v.available > 0);
  const url = `${siteUrl}/products/${p.slug}`;

  return (
    <>
      <Breadcrumbs items={[{ name: "التشكيلات", href: "/products" }, { name: p.name, href: `/products/${p.slug}` }]} />
      <div className="mt-5">
        <ProductView
          productName={p.name}
          variants={d.variants}
          colors={d.colors}
          sizes={d.sizes}
          media={d.media}
          initialColorId={initialColor}
          initialMode={sp.mode === "bulk" ? "BULK" : "RETAIL"}
          lowStockThreshold={settings.commerce.lowStockThreshold}
          details={
            p.specs.length > 0 ? (
              <section className="mt-10" aria-labelledby="specs-h">
                <h2 id="specs-h" className="text-lg font-bold">المواصفات</h2>
                <dl className="mt-3 divide-y divide-border border-y border-border">
                  {p.specs.map((s) => (
                    <div key={s.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 py-3 text-sm">
                      <dt className="text-muted-foreground">{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null
          }
        >
          {d.brands[0] && <p className="text-sm font-semibold text-sand">{d.brands[0].name}</p>}
          <h1 id="pname" className="mt-1 text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">{p.name}</h1>
          {p.description && <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{p.description}</p>}
        </ProductView>
      </div>

      {recs.length > 0 && (
        <section className="mt-16 md:mt-24" aria-labelledby="recs">
          <SectionHeading id="recs" title="ألوان أخرى قد تعجبك" action={{ href: "/products", label: "كل التشكيلات" }} />
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
