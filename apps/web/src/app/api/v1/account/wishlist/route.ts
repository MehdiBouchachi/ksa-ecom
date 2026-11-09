import { wishlistAddSchema } from "@saudi-ecom/contracts";
import { requireUser } from "@/server/auth/guards";
import { assertSameOrigin, ok, readJson, route } from "@/server/lib/http";
import { addToWishlist, listWishlist } from "@/server/wishlist";

export const GET = route(async () => {
  const u = await requireUser();
  return ok(await listWishlist(u.id));
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const u = await requireUser();
  const { variantId } = await readJson(req, wishlistAddSchema);
  return ok(await addToWishlist(u.id, variantId), { status: 201 });
});
