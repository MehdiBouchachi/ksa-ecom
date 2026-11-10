import type { Metadata } from "next";
import { CatalogPage } from "@/components/store/catalog-page";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const faceted = Object.values(sp).some((v) => v !== undefined && v !== "");
  return {
    title: "التشكيلات",
    description: "تسوّق جميع الألوان والمقاسات المتوفرة مع خيارات الشراء بالتجزئة والجملة.",
    alternates: { canonical: "/products" },
    // Faceted/filtered/paginated variants are not indexed (duplicate content); links still followed.
    ...(faceted ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  return <CatalogPage title="التشكيلات" description="كل الألوان والمقاسات المتوفرة. اختر لونًا لعرض المقاسات والسعر والتوفر." basePath="/products" searchParams={await searchParams} crumbs={[{ name: "التشكيلات", href: "/products" }]} />;
}
