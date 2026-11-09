import { getProductDetail } from "@/server/catalog";
import { AppError } from "@/server/lib/errors";
import { ok, route } from "@/server/lib/http";

export const dynamic = "force-dynamic";

export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const { slug } = await params;
  const p = await getProductDetail(decodeURIComponent(slug));
  if (!p) throw new AppError("NOT_FOUND", "المنتج غير موجود");
  return ok(p);
});
