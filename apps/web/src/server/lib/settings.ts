import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Executor } from "../db";
import { storeSettings } from "../db/schema";

/**
 * Store settings. Values marked PENDING are merchant decisions; we never invent them.
 * shippingFlatHalalas=null means "not configured" => checkout refuses with NOT_CONFIGURED.
 */
export const commerceSettingsSchema = z.object({
  /** Saudi standard VAT rate is 15% (1500 bps); merchant must confirm VAT registration/display. */
  vatRateBps: z.number().int().min(0).max(5000).default(1500),
  pricesIncludeVat: z.boolean().default(true),
  reservationMinutes: z.number().int().min(5).max(120).default(15),
  termsVersion: z.string().min(1).max(40).default("draft-1"),
  shippingFlatHalalas: z.number().int().min(0).nullable().default(null),
  freeShippingThresholdHalalas: z.number().int().min(0).nullable().default(null),
  guestCheckout: z.boolean().default(false),
  lowStockThreshold: z.number().int().min(0).default(5),
});
export type CommerceSettings = z.infer<typeof commerceSettingsSchema>;

export const storeProfileSchema = z.object({
  name: z.string().default("المتجر"),
  nameEn: z.string().default("Store"),
  legalName: z.string().nullable().default(null),
  commercialRegistration: z.string().nullable().default(null),
  vatNumber: z.string().nullable().default(null),
  email: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  whatsapp: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  /** Payment method badges may only be shown when the PSP account actually supports them. */
  enabledPaymentMethods: z.array(z.enum(["MADA", "VISA", "MASTERCARD", "APPLE_PAY"])).default([]),
  /** True only after merchant + legal sign-off (ACC-18). */
  legalApproved: z.boolean().default(false),
});
export type StoreProfile = z.infer<typeof storeProfileSchema>;

const SCHEMAS = { commerce: commerceSettingsSchema, store: storeProfileSchema } as const;
type Key = keyof typeof SCHEMAS;
type Value<K extends Key> = z.infer<(typeof SCHEMAS)[K]>;

export async function getSetting<K extends Key>(key: K, exec: Executor = getDb()): Promise<Value<K>> {
  const rows = await exec.select().from(storeSettings).where(eq(storeSettings.key, key)).limit(1);
  return SCHEMAS[key].parse(rows[0]?.value ?? {}) as Value<K>;
}

export async function getSettings(exec: Executor = getDb()) {
  const rows = await exec.select().from(storeSettings).where(inArray(storeSettings.key, ["commerce", "store"]));
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    commerce: commerceSettingsSchema.parse(map.get("commerce") ?? {}),
    store: storeProfileSchema.parse(map.get("store") ?? {}),
  };
}

export async function putSetting<K extends Key>(key: K, value: Partial<Value<K>>, actorId: string | null, exec: Executor = getDb()) {
  const current = await getSetting(key, exec);
  const next = SCHEMAS[key].parse({ ...current, ...value });
  await exec
    .insert(storeSettings)
    .values({ key, value: next, updatedBy: actorId })
    .onConflictDoUpdate({ target: storeSettings.key, set: { value: next, updatedBy: actorId, updatedAt: new Date() } });
  return next as Value<K>;
}
