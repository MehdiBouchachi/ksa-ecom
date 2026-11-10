import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Layers3, Lock, PackageSearch, Plus, RotateCcw, ShoppingBag, Truck } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import { JsonLd } from "@/components/store/json-ld";
import { ProductGrid } from "@/components/store/product-card";
import { btnPrimary, btnSecondary, SectionHeading, TextilePanel } from "@/components/store/ui";
import { siteUrl } from "@/lib/site";
import { getContent } from "@/server/admin/catalog";
import { getFacets, getProductDetail, listCatalog } from "@/server/catalog";
import { integrationStatus } from "@/server/lib/integration-status";
import { getSetting } from "@/server/lib/settings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** "## question\nanswer" blocks from the merchant's FAQ page. */
function faqPairs(body: string | undefined) {
  if (!body) return [];
  return body
    .split(/\n{2,}/)
    .map((b) => b.split("\n"))
    .filter((l) => l[0]?.startsWith("## "))
    .map((l) => ({ q: l[0]!.slice(3).trim(), a: l.slice(1).join(" ").trim() }))
    .filter((p) => p.q && p.a)
    .slice(0, 5);
}
const firstParagraph = (body: string | undefined) => body?.split(/\n{2,}/).find((b) => b.trim() && !b.startsWith("#"))?.trim();

export default async function Home() {
  const [catalog, store, home, about, faq, facets, returns] = await Promise.all([
    listCatalog({ sort: "recommended", page: 1, pageSize: 8, color: [], size: [], inStock: false }),
    getSetting("store"),
    getContent("home"),
    getContent("about"),
    getContent("faq"),
    getFacets(),
    getContent("returns"),
  ]);
  const cards = catalog.items;
  const product = cards[0] ? await getProductDetail(cards[0].productSlug) : null;
  const integrations = integrationStatus();

  // Facts derived from real catalogue data only.
  const sellable = product?.variants ?? [];
  const bulkTiers = sellable.flatMap((v) => v.tiers.filter((t) => t.mode === "BULK"));
  const hasBulk = bulkTiers.length > 0;
  const bulkMin = hasBulk ? Math.min(...bulkTiers.map((t) => t.minQty)) : null;
  const bulkFrom = hasBulk ? Math.min(...bulkTiers.map((t) => t.unitPriceHalalas)) : null;
  const retailFrom = sellable.length ? Math.min(...sellable.map((v) => v.retailPriceHalalas)) : null;
  const heroImage = product?.media.find((m) => m.kind === "IMAGE") ?? null;
  const productHref = product ? `/products/${product.product.slug}` : "/products";

  // Merchant copy is used only once approved; otherwise neutral, factual defaults.
  const approvedHome = home?.approved ? home : null;
  const headline = approvedHome?.title || "اختر اللون والمقاس الذي يناسبك";
  const intro =
    firstParagraph(approvedHome?.body) ||
    `تشكيلة من ${product?.colors.length ?? 0} ألوان و${product?.sizes.length ?? 0} مقاسات من منتج واحد${hasBulk ? "، للشراء بالقطعة أو بالجملة بأسعار حسب الكمية" : ""}.`;
  const aboutText = about?.approved ? firstParagraph(about.body) : undefined;
  const faqs = faq?.approved ? faqPairs(faq.body) : [];

  const trust = [
    { icon: Lock, title: "دفع آمن", text: "تتم عملية الدفع في صفحة مزود الدفع؛ لا نحتفظ ببيانات بطاقتك." },
    integrations.shipping === "live"
      ? { icon: Truck, title: "شحن عبر أرامكس", text: "رقم بوليصة وتتبع للشحنة يظهر في صفحة طلبك." }
      : { icon: PackageSearch, title: "تابع طلبك", text: "حالة الدفع والتجهيز والشحن لكل طلب في حسابك." },
    returns?.approved ? { icon: RotateCcw, title: "سياسة استرجاع واضحة", text: "اطّلع على شروط الاسترجاع والاستبدال قبل الشراء.", href: "/policies/returns" } : null,
  ].filter(Boolean) as { icon: typeof Lock; title: string; text: string; href?: string }[];

  return (
    <>
      {/* ------------------------------------------------------------------ Hero */}
      <section className="overflow-hidden bg-muted/60" aria-labelledby="hero-h">
        <div className="container-store grid items-center gap-8 py-8 md:grid-cols-[1.05fr_1fr] md:gap-12 md:py-14 lg:py-20">
          <div className="store-reveal order-2 md:order-1">
            <p className="text-sm font-semibold text-sand">{store.name}</p>
            <h1 id="hero-h" className="mt-3 text-[32px] font-bold leading-[1.25] tracking-tight md:text-[44px] lg:text-[52px]">{headline}</h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">{intro}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/products" className={btnPrimary}>
                تصفح التشكيلات
              </Link>
              {hasBulk && product && (
                <Link href={`${productHref}?mode=bulk`} className={btnSecondary}>
                  الشراء بالجملة
                </Link>
              )}
            </div>
            {product && (
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="معلومات سريعة">
                <li><strong className="font-semibold text-foreground">{product.colors.length}</strong> ألوان</li>
                <li><strong className="font-semibold text-foreground">{product.sizes.length}</strong> مقاسات</li>
                {hasBulk && <li>تجزئة وجملة من نفس المخزون</li>}
              </ul>
            )}
          </div>

          <div className="order-1 md:order-2">
            {heroImage ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl md:aspect-[5/6]">
                <Image src={heroImage.url} alt={heroImage.alt} fill priority sizes="(min-width: 768px) 46vw, 100vw" className="object-cover" />
              </div>
            ) : product && product.colors.length > 0 ? (
              // No approved photography yet: an editorial arrangement of the REAL colours as cloth.
              <div className="grid aspect-[5/4] grid-cols-[1.4fr_1fr] grid-rows-2 gap-3 md:aspect-[5/6]">
                {product.colors.slice(0, 3).map((c, i) => (
                  <Link
                    key={c.id}
                    href={`${productHref}?color=${c.slug}`}
                    className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "row-span-2" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
                  >
                    <TextilePanel hex={c.swatchHex} className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none" />
                    <span className="absolute bottom-3 start-3 rounded-md bg-card/95 px-2.5 py-1 text-sm font-semibold shadow-sm">{c.name}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- Shop by colour */}
      {cards.length > 0 && (
        <section className="container-store py-14 md:py-20" aria-labelledby="colors-h">
          <SectionHeading id="colors-h" eyebrow="التشكيلة" title="اكتشف الألوان المتوفرة" description="كل لون متاح بعدة مقاسات. اختر اللون لعرض المقاسات والسعر والتوفر." action={{ href: "/products", label: "عرض جميع التشكيلات" }} />
          <ProductGrid items={cards} />
        </section>
      )}

      {/* ----------------------------------------------------- Retail / wholesale */}
      {product && retailFrom !== null && (
        <section className="bg-muted/60 py-14 md:py-20" aria-labelledby="modes-h">
          <div className="container-store">
            <SectionHeading id="modes-h" eyebrow="طريقتان للشراء" title={hasBulk ? "بالقطعة أو بالجملة — من نفس المخزون" : "اشترِ القطعة التي تناسبك"} description={hasBulk ? "السعر يُحسب لكل لون ومقاس على حدة حسب الكمية، ويُؤكَّد عند إتمام الطلب." : undefined} />
            <div className={`grid gap-4 ${hasBulk ? "md:grid-cols-2" : "max-w-xl"}`}>
              <article className="flex flex-col rounded-2xl bg-card p-6 md:p-8">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden><ShoppingBag className="size-5" /></span>
                <h3 className="mt-5 text-xl font-bold">شراء بالتجزئة</h3>
                <p className="mt-2 leading-7 text-muted-foreground">اختر اللون والمقاس واطلب قطعة واحدة أو عددًا قليلًا.</p>
                <p className="mt-5 text-sm text-muted-foreground">يبدأ من <span className="text-lg font-bold text-foreground">{formatSAR(retailFrom)}</span> للقطعة</p>
                <Link href={productHref} className={`${btnSecondary} mt-6 self-start`}>تسوّق بالقطعة</Link>
              </article>
              {hasBulk && bulkMin !== null && bulkFrom !== null && (
                <article className="flex flex-col rounded-2xl bg-card p-6 ring-1 ring-primary/20 md:p-8">
                  <span className="grid size-11 place-items-center rounded-xl bg-sand-soft text-sand" aria-hidden><Layers3 className="size-5" /></span>
                  <h3 className="mt-5 text-xl font-bold">شراء بالجملة</h3>
                  <p className="mt-2 leading-7 text-muted-foreground">
                    ابتداءً من {bulkMin} قطعة من نفس اللون والمقاس، ويقل سعر القطعة حسب شرائح الكمية التي يحددها المتجر.
                  </p>
                  <p className="mt-5 text-sm text-muted-foreground">أسعار الجملة تبدأ من <span className="text-lg font-bold text-foreground">{formatSAR(bulkFrom)}</span> للقطعة</p>
                  <Link href={`${productHref}?mode=bulk`} className={`${btnPrimary} mt-6 self-start`}>عرض أسعار الجملة</Link>
                </article>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ Collections */}
      {facets.collections.length >= 2 && (
        <section className="container-store py-14 md:py-20" aria-labelledby="col-h">
          <SectionHeading id="col-h" eyebrow="مختارات" title="المجموعات" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facets.collections.slice(0, 3).map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="group flex min-h-36 flex-col justify-between rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
                  <span className="h-1 w-10 rounded-full bg-sand" aria-hidden />
                  <span className="mt-6 flex items-center justify-between gap-3 text-lg font-bold">
                    {c.name}
                    <ArrowLeft className="size-5 text-primary transition-transform group-hover:-translate-x-1 ltr:rotate-180" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------------ Story */}
      {aboutText && (
        <section className="container-store py-14 md:py-20" aria-labelledby="about-h">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
            {product?.colors[0] && <TextilePanel hex={product.colors[1]?.swatchHex ?? product.colors[0].swatchHex} className="aspect-[4/3] rounded-2xl" />}
            <div>
              <p className="text-sm font-semibold text-sand">{about!.title}</p>
              <p className="mt-3 text-xl leading-9 md:text-2xl md:leading-10">{aboutText}</p>
              <Link href="/about" className={`${btnSecondary} mt-6`}>اقرأ قصتنا</Link>
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------ Trust */}
      <section className="border-y border-border" aria-label="الشراء بثقة">
        <ul className={`container-store grid gap-8 py-10 md:py-12 ${trust.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {trust.map((p) => (
            <li key={p.title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden><p.icon className="size-5" /></span>
              <div>
                <h3 className="font-semibold">{p.href ? <Link href={p.href} className="hover:text-primary">{p.title}</Link> : p.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------------------- FAQ */}
      {faqs.length > 0 && (
        <section className="container-store py-14 md:py-20" aria-labelledby="faq-h">
          <div className="grid gap-8 md:grid-cols-[1fr_1.6fr] md:gap-14">
            <SectionHeading id="faq-h" title="أسئلة شائعة" description="إجابات مختصرة عن الطلب والشحن والشراء بالجملة." action={{ href: "/faq", label: "كل الأسئلة" }} />
            <div className="divide-y divide-border border-y border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus className="size-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none" aria-hidden />
                  </summary>
                  <p className="pb-5 leading-7 text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- Final CTA */}
      {product && (
        <section className="container-store pt-14 md:pt-20" aria-labelledby="cta-h">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-6 py-10 text-primary-foreground md:px-12 md:py-14">
            <div className="relative z-10 max-w-xl">
              <h2 id="cta-h" className="text-2xl font-bold leading-tight md:text-[32px]">اختر اللون والمقاس المناسب لك</h2>
              <p className="mt-3 leading-7 text-primary-foreground/80">السعر والتوفر يظهران فور اختيارك، ويُؤكَّدان عند إتمام الطلب.</p>
              <Link href="/products" className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-card px-6 font-semibold text-primary transition-colors hover:bg-muted">ابدأ التسوق</Link>
            </div>
            {product.colors[0] && <TextilePanel hex={product.colors[0].swatchHex} className="absolute inset-y-0 end-0 hidden w-1/3 opacity-60 md:block" />}
          </div>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: store.legalName ?? store.name,
          url: siteUrl,
          ...(store.email ? { email: store.email } : {}),
          ...(store.phone ? { telephone: store.phone } : {}),
        }}
      />
    </>
  );
}
