import { TaxonomyAdmin, taxonomyTitle } from "@/components/admin/taxonomy-admin";

export async function generateMetadata() {
  return { title: await taxonomyTitle("categories") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string }> }) {
  return <TaxonomyAdmin kind="categories" sp={await searchParams} />;
}
