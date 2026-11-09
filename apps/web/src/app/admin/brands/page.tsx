import { TaxonomyAdmin, taxonomyTitle } from "@/components/admin/taxonomy-admin";

export async function generateMetadata() {
  return { title: await taxonomyTitle("brands") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string }> }) {
  return <TaxonomyAdmin kind="brands" sp={await searchParams} />;
}
