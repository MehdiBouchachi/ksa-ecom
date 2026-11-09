import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { listActiveProductSlugs, listTaxonomySlugs } from "@/server/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, tax] = await Promise.all([listActiveProductSlugs(), listTaxonomySlugs()]);
  const statics = ["", "/products", "/about", "/faq", "/contact", "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms"];
  return [
    ...statics.map((p) => ({ url: `${siteUrl}${p}` })),
    ...products.map((p) => ({ url: `${siteUrl}/products/${p.slug}`, lastModified: p.updatedAt })),
    ...tax.categories.map((s) => ({ url: `${siteUrl}/categories/${s}` })),
    ...tax.brands.map((s) => ({ url: `${siteUrl}/brands/${s}` })),
    ...tax.collections.map((s) => ({ url: `${siteUrl}/collections/${s}` })),
  ];
}
