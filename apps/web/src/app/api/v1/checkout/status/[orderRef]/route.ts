import { requireUser } from "@/server/auth/guards";
import { ok, route } from "@/server/lib/http";
import { getCheckoutStatus } from "@/server/payments/service";

/** Server-verified status (never inferred from the browser return URL). */
export const GET = route<{ params: Promise<{ orderRef: string }> }>(async (_req, { params }) => {
  const u = await requireUser();
  const s = await getCheckoutStatus(u.id, decodeURIComponent((await params).orderRef));
  return ok({ orderReference: s.reference, orderStatus: s.orderStatus, paymentStatus: s.paymentStatus, shippingStatus: s.shippingStatus, totalHalalas: s.totalHalalas });
});
