import { notFound } from "next/navigation";
import { ContentPage, contentMetadata } from "@/components/store/content-page";

const POLICIES = ["shipping", "returns", "privacy", "terms"];
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return POLICIES.includes(slug) ? contentMetadata(slug, `/policies/${slug}`) : {};
}
export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!POLICIES.includes(slug)) notFound();
  return <ContentPage slug={slug} href={`/policies/${slug}`} />;
}
