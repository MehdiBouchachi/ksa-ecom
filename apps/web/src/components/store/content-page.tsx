import { notFound } from "next/navigation";
import { getContent } from "@/server/admin/catalog";
import { Breadcrumbs } from "./breadcrumbs";
import { ContentBody } from "./content-body";

export async function ContentPage({ slug, href }: { slug: string; href: string }) {
  const c = await getContent(slug);
  if (!c) notFound();
  return (
    <>
      <Breadcrumbs items={[{ name: c.title, href }]} />
      <h1 className="mt-2 text-2xl font-bold">{c.title}</h1>
      <div className="mt-4">
        <ContentBody body={c.body} approved={c.approved} />
      </div>
    </>
  );
}

export async function contentMetadata(slug: string, href: string) {
  const c = await getContent(slug);
  if (!c) return {};
  return { title: c.title, description: c.body.replace(/^## .*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 155), alternates: { canonical: href } };
}
