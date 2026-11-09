import { staffRoute } from "@/server/lib/admin-route";
import { AppError } from "@/server/lib/errors";

/**
 * Signed direct-to-object-storage upload (e.g. Cloudflare R2). Storage provider is PENDING merchant
 * approval; until configured we refuse rather than write uploads into the Hostinger deploy directory.
 */
export const POST = staffRoute(async () => {
  throw new AppError("NOT_CONFIGURED", "تخزين الوسائط غير مُعد بعد. أضف رابط الصورة من التخزين المعتمد يدويًا.");
});
