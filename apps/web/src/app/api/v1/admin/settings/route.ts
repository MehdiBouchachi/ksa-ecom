import { z } from "zod";
import { staffRoute } from "@/server/lib/admin-route";
import { AppError } from "@/server/lib/errors";
import { ok, readJson } from "@/server/lib/http";
import { commerceSettingsSchema, getSettings, putSetting, storeProfileSchema } from "@/server/lib/settings";

/** Managers may edit operational shipping/stock settings only; tax, legal and payment settings are Admin-only. */
const MANAGER_COMMERCE_KEYS = ["shippingFlatHalalas", "freeShippingThresholdHalalas", "lowStockThreshold"] as const;

const patchSchema = z.object({
  commerce: commerceSettingsSchema.partial().optional(),
  store: storeProfileSchema.partial().optional(),
});

export const GET = staffRoute(async () => ok(await getSettings()));

export const PATCH = staffRoute(async (req, u) => {
  const body = await readJson(req, patchSchema);
  if (u.role !== "ADMIN") {
    const commerceKeys = Object.keys(body.commerce ?? {});
    if (body.store || commerceKeys.some((k) => !(MANAGER_COMMERCE_KEYS as readonly string[]).includes(k))) {
      throw new AppError("FORBIDDEN", "هذه الإعدادات للمدير العام فقط");
    }
  }
  if (body.commerce) await putSetting("commerce", body.commerce, u.id);
  if (body.store) await putSetting("store", body.store, u.id);
  return ok(await getSettings());
});
