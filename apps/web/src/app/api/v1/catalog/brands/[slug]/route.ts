import { catalogQuerySchema } from "@saudi-ecom/contracts";
import { getTaxonomy, listCatalog } from "@/server/catalog";
import { AppError } from "@/server/lib/errors";
import { ok, route } from "@/server/lib/http";

export const dynamic = "force-dynamic";

export const GET = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const { slug } = await params;
  const t = await getTaxonomy("brand", decodeURIComponent(slug));
  if (!t) throw new AppError("NOT_FOUND", "غير موجود");
  const q = catalogQuerySchema.parse({ ...Object.fromEntries(new URL(req.url).searchParams), brand: t.slug });
  const r = await listCatalog(q);
  return ok({ brand: t, items: r.items }, { meta: { total: r.total, page: r.page, pageSize: r.pageSize } });
});
