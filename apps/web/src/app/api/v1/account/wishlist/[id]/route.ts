import { requireUser } from "@/server/auth/guards";
import { AppError } from "@/server/lib/errors";
import { assertSameOrigin, ok, route } from "@/server/lib/http";
import { removeFromWishlist } from "@/server/wishlist";

export const DELETE = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const u = await requireUser();
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND", "غير موجود");
  await removeFromWishlist(u.id, id);
  return ok({ removed: true });
});
