import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Roles & enums                                                        */
/* ------------------------------------------------------------------ */
export const ROLES = ["CUSTOMER", "MANAGER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PURCHASE_MODES = ["RETAIL", "BULK"] as const;
export type PurchaseMode = (typeof PURCHASE_MODES)[number];

/** Order lifecycle (independent from payment and shipping). */
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  /** Paid after the hold was released and stock could not be re-allocated. Needs manual handling/refund. */
  "REQUIRES_RECONCILIATION",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SHIPMENT_STATUSES = [
  "NOT_CREATED",
  "CREATED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const RESERVATION_STATUSES = ["ACTIVE", "CONSUMED", "RELEASED", "EXPIRED"] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* State machines                                                       */
/* ------------------------------------------------------------------ */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "REQUIRES_RECONCILIATION"],
  CONFIRMED: ["PROCESSING", "READY_FOR_SHIPPING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["READY_FOR_SHIPPING", "SHIPPED", "CANCELLED"],
  READY_FOR_SHIPPING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
  REQUIRES_RECONCILIATION: ["CONFIRMED", "CANCELLED"],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  FAILED: ["PAID"], // late capture after a failure/expiry notice (handled by reconciliation path)
  PAID: ["REFUNDED"],
  REFUNDED: [],
};

/** Shipments may report out of order; we only move "forward" except terminal FAILED/RETURNED. */
export const SHIPMENT_RANK: Record<ShipmentStatus, number> = {
  NOT_CREATED: 0,
  CREATED: 1,
  PICKED_UP: 2,
  IN_TRANSIT: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  FAILED: 6,
  RETURNED: 7,
};

export function canTransition<S extends string>(map: Record<S, readonly S[]>, from: S, to: S): boolean {
  return map[from]?.includes(to) ?? false;
}

export function canAdvanceShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  if (from === to) return false;
  if (from === "DELIVERED" || from === "RETURNED") return to === "RETURNED" && from !== "RETURNED";
  return SHIPMENT_RANK[to] > SHIPMENT_RANK[from];
}

/* ------------------------------------------------------------------ */
/* Errors                                                               */
/* ------------------------------------------------------------------ */
export const ERROR_CODES = [
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "STOCK_UNAVAILABLE",
  "INVALID_VARIANT",
  "INVALID_QUANTITY",
  "BULK_MINIMUM_NOT_MET",
  "PRICE_CHANGED",
  "ORDER_EXPIRED",
  "PAYMENT_PROCESSING",
  "INVALID_STATE_TRANSITION",
  "IDEMPOTENCY_KEY_REUSED",
  "CONFLICT",
  "PROVIDER_UNAVAILABLE",
  "NOT_CONFIGURED",
  "INTERNAL",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  STOCK_UNAVAILABLE: 409,
  INVALID_VARIANT: 422,
  INVALID_QUANTITY: 422,
  BULK_MINIMUM_NOT_MET: 422,
  PRICE_CHANGED: 409,
  ORDER_EXPIRED: 409,
  PAYMENT_PROCESSING: 409,
  INVALID_STATE_TRANSITION: 409,
  IDEMPOTENCY_KEY_REUSED: 422,
  CONFLICT: 409,
  PROVIDER_UNAVAILABLE: 503,
  NOT_CONFIGURED: 503,
  INTERNAL: 500,
};

export type ApiError = { error: { code: ErrorCode; message: string; requestId: string; details?: unknown } };
export type ApiOk<T, M = undefined> = M extends undefined ? { data: T } : { data: T; meta: M };

/* ------------------------------------------------------------------ */
/* Shared field schemas                                                 */
/* ------------------------------------------------------------------ */
/** Saudi mobile: 05XXXXXXXX or +9665XXXXXXXX / 9665XXXXXXXX. Normalized to +9665XXXXXXXX. */
export const saudiPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(?:\+?966|0)5\d{8}$/.test(v), { message: "رقم جوال سعودي غير صالح" })
  .transform((v) => "+966" + v.replace(/^(?:\+?966|0)/, ""));

export const email = z.string().trim().toLowerCase().pipe(z.email({ message: "بريد إلكتروني غير صالح" })).pipe(z.string().max(254));
export const password = z
  .string()
  .min(10, { message: "كلمة المرور يجب أن تكون 10 أحرف على الأقل" })
  .max(128);
export const personName = z.string().trim().min(2).max(120);
export const uuid = z.uuid();
export const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9؀-ۿ]+(?:-[a-z0-9؀-ۿ]+)*$/, { message: "معرّف رابط غير صالح" });

export const saudiPostalCode = z.string().trim().regex(/^\d{5}$/, { message: "الرمز البريدي يجب أن يكون 5 أرقام" });

export const shippingAddressSchema = z.object({
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  street: z.string().trim().min(2).max(160),
  building: z.string().trim().min(1).max(40),
  postalCode: saudiPostalCode,
});
export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const customerContactSchema = z.object({
  name: personName,
  email,
  phone: saudiPhone,
});

export const checkoutItemSchema = z.object({
  variantId: uuid,
  quantity: z.number().int().min(1).max(100_000),
  purchaseMode: z.enum(PURCHASE_MODES),
});

/** Canonical checkout input. Never contains prices or totals: the server computes them. */
export const checkoutPrepareSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  customer: customerContactSchema,
  shippingAddress: shippingAddressSchema,
  acceptedTermsVersion: z.string().trim().min(1).max(40),
});
export type CheckoutPrepareInput = z.infer<typeof checkoutPrepareSchema>;

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(100)
  .regex(/^[A-Za-z0-9_\-:.]+$/);

export const pricingQuoteSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
});

export type QuoteLine = {
  variantId: string;
  quantity: number;
  purchaseMode: PurchaseMode;
  unitPriceHalalas: number;
  lineTotalHalalas: number;
  taxHalalas: number;
  tierId: string | null;
  tierMinQty: number | null;
  tierMaxQty: number | null;
};

export type Quote = {
  currency: "SAR";
  items: QuoteLine[];
  subtotalHalalas: number;
  shippingHalalas: number;
  taxHalalas: number;
  totalHalalas: number;
  pricesIncludeVat: boolean;
  vatRateBps: number;
};

export type CheckoutPrepareResult = {
  orderReference: string;
  orderId: string;
  currency: "SAR";
  items: { variantId: string; quantity: number; unitPriceHalalas: number; lineTotalHalalas: number }[];
  subtotalHalalas: number;
  shippingHalalas: number;
  taxHalalas: number;
  totalHalalas: number;
  paymentStatus: "PENDING";
  reservationExpiresAt: string;
};

export const paymentSessionSchema = z.object({ orderReference: z.string().trim().min(6).max(40) });

export const registerSchema = z.object({
  name: personName,
  email,
  phone: saudiPhone.optional().or(z.literal("").transform(() => undefined)),
  password,
});
// Note: no role field. Sign-up is always CUSTOMER.

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });

export const profileUpdateSchema = z.object({
  name: personName.optional(),
  phone: saudiPhone.optional().or(z.literal("").transform(() => null)),
  avatarKey: z.string().trim().max(300).nullable().optional(),
});

export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password });

export const contactSchema = z.object({
  name: personName,
  email,
  phone: saudiPhone.optional().or(z.literal("").transform(() => undefined)),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10).max(4000),
});

export const wishlistAddSchema = z.object({ variantId: uuid });

/* Catalog query */
export const CATALOG_SORTS = ["recommended", "newest", "price_asc", "price_desc", "bestselling"] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30) : []));

export const catalogQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(120).optional(),
  brand: z.string().trim().max(120).optional(),
  collection: z.string().trim().max(120).optional(),
  color: csv,
  size: csv,
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  inStock: z
    .enum(["1", "true", "0", "false"])
    .optional()
    .transform((v) => v === "1" || v === "true"),
  sort: z.enum(CATALOG_SORTS).default("recommended"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

/* Admin */
export const inventoryAdjustmentSchema = z.object({
  variantId: uuid,
  delta: z.number().int().min(-1_000_000).max(1_000_000).refine((v) => v !== 0, "delta must not be 0"),
  reason: z.string().trim().min(3).max(300),
});

export const priceTierSchema = z
  .object({
    variantId: uuid,
    mode: z.enum(PURCHASE_MODES),
    minQty: z.number().int().min(1),
    maxQty: z.number().int().min(1).nullable(),
    unitPriceHalalas: z.number().int().min(1),
  })
  .refine((t) => t.maxQty === null || t.maxQty >= t.minQty, { message: "maxQty must be >= minQty", path: ["maxQty"] });

export const orderStatusChangeSchema = z.object({ status: z.enum(ORDER_STATUSES), note: z.string().trim().max(500).optional() });
export const orderCancelSchema = z.object({ reason: z.string().trim().min(3).max(500), restock: z.boolean().default(true) });

export const teamMemberCreateSchema = z.object({
  name: personName,
  email,
  role: z.enum(["MANAGER", "ADMIN"]),
  password,
});
export const teamMemberUpdateSchema = z.object({
  role: z.enum(["MANAGER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

/* ------------------------------------------------------------------ */
/* Money & date helpers (integer halalas; Latin digits, Gregorian calendar)                                      */
/* ------------------------------------------------------------------ */
export function formatSAR(halalas: number, locale: "ar" | "en" = "ar"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(halalas / 100);
}

/** Round half-up on non-negative rational value numerator/denominator. */
export function roundHalfUpDiv(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error("roundHalfUpDiv requires safe integers and positive denominator");
  }
  const q = Math.floor(numerator / denominator);
  const r = numerator - q * denominator;
  return r * 2 >= denominator ? q + 1 : q;
}

/** ar-SA defaults to the Hijri calendar and Arabic-Indic digits; we show Gregorian dates with Latin digits. */
const DATE_LOCALE = "ar-SA-u-ca-gregory-nu-latn";
export function formatDate(d: Date | string, withTime = false, locale: "ar" | "en" = "ar"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : DATE_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Riyadh" } : { timeZone: "Asia/Riyadh" }),
  }).format(date);
}
