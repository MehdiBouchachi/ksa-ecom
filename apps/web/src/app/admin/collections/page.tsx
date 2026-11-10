import { TaxonomyAdmin, taxonomyTitle } from "@/components/admin/taxonomy-admin";

export async function generateMetadata() {
  return { title: await taxonomyTitle("collections") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; q?: string }> }) {
  return <TaxonomyAdmin kind="collections" sp={await searchParams} />;
}
