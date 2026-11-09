import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage } from "@/components/store/catalog-page";
import { getTaxonomy } from "@/server/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const t = await getTaxonomy("category", decodeURIComponent((await params).slug));
  if (!t) return {};
  const faceted = Object.values(await searchParams).some((v) => v !== undefined && v !== "");
  return {
    title: t.seoTitle ?? t.name,
    description: t.seoDescription ?? (t.description.slice(0, 160) || undefined),
    alternates: { canonical: `/categories/${t.slug}` },
    ...(faceted ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function Page({ params, searchParams }: Props) {
  const t = await getTaxonomy("category", decodeURIComponent((await params).slug));
  if (!t) notFound();
  const base = `/categories/${encodeURIComponent(t.slug)}`;
  return (
    <CatalogPage
      title={t.name}
      description={t.description}
      basePath={base}
      searchParams={await searchParams}
      fixed={{ category: t.slug }}
      crumbs={[{ name: "المنتجات", href: "/products" }, { name: t.name, href: base }]}
    />
  );
}
