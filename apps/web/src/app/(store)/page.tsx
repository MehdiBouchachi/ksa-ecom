import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/store/json-ld";
import { BoxIcon, ShieldIcon, TruckIcon } from "@/components/store/icons";
import { ProductGrid } from "@/components/store/product-card";
import { siteUrl } from "@/lib/site";
import { getContent } from "@/server/admin/catalog";
import { listCatalog } from "@/server/catalog";
import { getSetting } from "@/server/lib/settings";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function faqPairs(body: string | undefined) {
  if (!body) return [];
  return body
    .split(/\n{2,}/)
    .map((b) => b.split("\n"))
    .filter((l) => l[0]?.startsWith("## "))
    .map((l) => ({ q: l[0]!.slice(3), a: l.slice(1).join(" ") }))
    .slice(0, 4);
}

export default async function Home() {
  const [featured, store, about, faq] = await Promise.all([
    listCatalog({ sort: "recommended", page: 1, pageSize: 8, color: [], size: [], inStock: false }),
    getSetting("store"),
    getContent("about"),
    getContent("faq"),
  ]);
  const hero = featured.items.find((c) => c.imageUrl);
  const faqs = faqPairs(faq?.body);
  return (
    <>
      <section className="grid items-center gap-8 rounded-xl bg-card p-6 sm:p-10 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{store.name}</h1>
          <p className="mt-4 text-lg text-muted-foreground">اختر لونك ومقاسك، واشترِ قطعة واحدة أو بالجملة بأسعار شرائح واضحة — مع شحن داخل المملكة.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products" className="inline-flex min-h-12 items-center rounded-md bg-primary px-6 font-semibold text-white">تسوّق الآن</Link>
            <Link href="/products?sort=bestselling" className="inline-flex min-h-12 items-center rounded-md border border-input px-6 font-semibold">الأكثر مبيعًا</Link>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
          <Image src={hero?.imageUrl ?? "/placeholder.svg"} alt={hero?.imageAlt ?? store.name} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="featured">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="featured" className="text-2xl font-bold">الألوان والخيارات المتوفرة</h2>
          <Link href="/products" className="text-sm font-semibold text-primary">عرض الكل</Link>
        </div>
        <ProductGrid items={featured.items} />
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-3" aria-label="لماذا نحن">
        {[
          { icon: <BoxIcon />, title: "تجزئة وجملة", text: "اشترِ قطعة واحدة أو كميات كبيرة بأسعار شرائح، من نفس المخزون." },
          { icon: <TruckIcon />, title: "شحن عبر أرامكس", text: "رقم بوليصة وتتبع للشحنة من صفحة طلبك." },
          { icon: <ShieldIcon />, title: "دفع آمن", text: "صفحة دفع مستضافة لدى مزود الدفع؛ لا نخزن بيانات بطاقتك." },
        ].map((f) => (
          <div key={f.title} className="rounded-lg border border-border bg-card p-5">
            <div className="text-primary">{f.icon}</div>
            <h3 className="mt-2 font-bold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      {about && (
        <section className="mt-12 rounded-lg border border-border bg-card p-6" aria-labelledby="about">
          <h2 id="about" className="text-xl font-bold">{about.title}</h2>
          <p className="mt-2 line-clamp-4 text-muted-foreground">{about.body.split(/\n{2,}/).find((b) => !b.startsWith("## "))}</p>
          <Link href="/about" className="mt-3 inline-block font-semibold text-primary">اقرأ المزيد</Link>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="mt-12" aria-labelledby="faq">
          <h2 id="faq" className="text-xl font-bold">أسئلة شائعة</h2>
          <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {faqs.map((f) => (
              <details key={f.q} className="p-4">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
          <Link href="/faq" className="mt-3 inline-block font-semibold text-primary">كل الأسئلة</Link>
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
