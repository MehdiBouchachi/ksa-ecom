import { TaxonomyAdmin } from "@/components/admin/taxonomy-admin";

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; edit?: string }> }) {
  return <TaxonomyAdmin kind="categories" sp={await searchParams} />;
}
