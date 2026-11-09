import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/*
 * PostgreSQL schema (Drizzle). Money = integer halalas. Timestamps = timestamptz.
 * Constraints that Drizzle cannot express (exclusion constraint on price tiers,
 * append-only trigger on inventory_adjustments/audit_logs) live in the custom
 * migration drizzle/0001_constraints.sql.
 */

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const id = () => uuid("id").primaryKey().defaultRandom();

/* ----------------------------- Users / auth ----------------------------- */
export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["CUSTOMER", "MANAGER", "ADMIN"] }).notNull().default("CUSTOMER"),
    status: text("status", { enum: ["ACTIVE", "DISABLED"] }).notNull().default("ACTIVE"),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    avatarKey: text("avatar_key"),
    /** Incremented on password change / disable to invalidate existing JWT sessions. */
    sessionVersion: integer("session_version").notNull().default(1),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`),
    check("users_role_ck", sql`${t.role} in ('CUSTOMER','MANAGER','ADMIN')`),
    check("users_status_ck", sql`${t.status} in ('ACTIVE','DISABLED')`),
    index("users_role_idx").on(t.role),
    index("users_created_idx").on(t.createdAt),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("prt_user_idx").on(t.userId)],
);

/** Auth.js-compatible verification tokens (email verification, if enabled later). */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/** DB-backed fixed-window rate limiting (no Redis on managed hosting). */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

/* ------------------------------- Catalog -------------------------------- */
export const products = pgTable(
  "products",
  {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    description: text("description").notNull().default(""),
    descriptionEn: text("description_en"),
    /** [{label, value}] product specifications */
    specs: jsonb("specs").$type<{ label: string; value: string }[]>().notNull().default([]),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("products_active_idx").on(t.active, t.sortOrder)],
);

export const colors = pgTable("colors", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  swatchHex: text("swatch_hex").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
}, (t) => [check("colors_hex_ck", sql`${t.swatchHex} ~ '^#[0-9A-Fa-f]{6}$'`)]);

export const sizes = pgTable("sizes", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const productVariants = pgTable(
  "product_variants",
  {
    id: id(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
    colorId: uuid("color_id").notNull().references(() => colors.id, { onDelete: "restrict" }),
    sizeId: uuid("size_id").notNull().references(() => sizes.id, { onDelete: "restrict" }),
    sku: text("sku").notNull().unique(),
    retailPriceHalalas: integer("retail_price_halalas").notNull(),
    /** Optional "was" price for showing a discount; must exceed retail price. */
    compareAtPriceHalalas: integer("compare_at_price_halalas"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("variants_product_color_size_uq").on(t.productId, t.colorId, t.sizeId),
    check("variants_price_ck", sql`${t.retailPriceHalalas} > 0`),
    check(
      "variants_compare_ck",
      sql`${t.compareAtPriceHalalas} is null or ${t.compareAtPriceHalalas} > ${t.retailPriceHalalas}`,
    ),
    index("variants_product_idx").on(t.productId, t.active),
    index("variants_color_idx").on(t.colorId),
    index("variants_size_idx").on(t.sizeId),
    index("variants_price_idx").on(t.retailPriceHalalas),
  ],
);

export const productMedia = pgTable(
  "product_media",
  {
    id: id(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    colorId: uuid("color_id").references(() => colors.id, { onDelete: "set null" }),
    kind: text("kind", { enum: ["IMAGE", "VIDEO"] }).notNull().default("IMAGE"),
    /** Public URL in durable storage (e.g. R2 custom domain) — never the app deploy dir. */
    url: text("url").notNull(),
    alt: text("alt").notNull(),
    width: integer("width"),
    height: integer("height"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("media_product_idx").on(t.productId, t.sortOrder)],
);

const taxonomy = (name: string) =>
  pgTable(name, {
    id: id(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    description: text("description").notNull().default(""),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  });

export const categories = taxonomy("categories");
export const brands = taxonomy("brands");
export const collections = taxonomy("collections");

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.categoryId] }), index("pc_category_idx").on(t.categoryId)],
);
export const productBrands = pgTable(
  "product_brands",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.brandId] }), index("pb_brand_idx").on(t.brandId)],
);
export const productCollections = pgTable(
  "product_collections",
  {
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.productId, t.collectionId] }), index("pcol_collection_idx").on(t.collectionId)],
);

/* ------------------------------- Pricing -------------------------------- */
export const priceTiers = pgTable(
  "price_tiers",
  {
    id: id(),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
    mode: text("mode", { enum: ["RETAIL", "BULK"] }).notNull(),
    minQty: integer("min_qty").notNull(),
    maxQty: integer("max_qty"),
    unitPriceHalalas: integer("unit_price_halalas").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check("tiers_mode_ck", sql`${t.mode} in ('RETAIL','BULK')`),
    check("tiers_min_ck", sql`${t.minQty} >= 1`),
    check("tiers_max_ck", sql`${t.maxQty} is null or ${t.maxQty} >= ${t.minQty}`),
    check("tiers_price_ck", sql`${t.unitPriceHalalas} > 0`),
    index("tiers_variant_idx").on(t.variantId, t.mode, t.active),
    // Non-overlap enforced by exclusion constraint in 0001_constraints.sql
  ],
);

/* ------------------------------ Inventory ------------------------------- */
export const inventory = pgTable(
  "inventory",
  {
    variantId: uuid("variant_id").primaryKey().references(() => productVariants.id, { onDelete: "restrict" }),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    version: integer("version").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("inventory_on_hand_ck", sql`${t.onHand} >= 0`),
    check("inventory_reserved_ck", sql`${t.reserved} >= 0`),
    check("inventory_reserved_le_on_hand_ck", sql`${t.reserved} <= ${t.onHand}`),
  ],
);

export const inventoryAdjustments = pgTable(
  "inventory_adjustments",
  {
    id: id(),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    /** RESTOCK | ADJUSTMENT | SALE | CANCEL_RESTOCK | RETURN_RESTOCK */
    kind: text("kind").notNull().default("ADJUSTMENT"),
    onHandAfter: integer("on_hand_after").notNull(),
    reservedAfter: integer("reserved_after").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    orderId: uuid("order_id"),
    createdAt: createdAt(),
  },
  (t) => [
    check("adj_delta_ck", sql`${t.delta} <> 0`),
    index("adj_variant_idx").on(t.variantId, t.createdAt),
    // At most one restock per order+variant (prevents double restock).
    uniqueIndex("adj_restock_once_uq")
      .on(t.orderId, t.variantId, t.kind)
      .where(sql`${t.orderId} is not null and ${t.kind} in ('CANCEL_RESTOCK','RETURN_RESTOCK')`),
  ],
);

/* -------------------------------- Orders -------------------------------- */
export type AddressSnapshot = { city: string; district: string; street: string; building: string; postalCode: string };
export type CustomerSnapshot = { name: string; email: string; phone: string };

export const orders = pgTable(
  "orders",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
    orderStatus: text("order_status").notNull().default("PENDING"),
    paymentStatus: text("payment_status").notNull().default("PENDING"),
    shippingStatus: text("shipping_status").notNull().default("NOT_CREATED"),
    currency: text("currency").notNull().default("SAR"),
    subtotalHalalas: integer("subtotal_halalas").notNull(),
    shippingHalalas: integer("shipping_halalas").notNull(),
    taxHalalas: integer("tax_halalas").notNull(),
    totalHalalas: integer("total_halalas").notNull(),
    pricesIncludeVat: boolean("prices_include_vat").notNull(),
    vatRateBps: integer("vat_rate_bps").notNull(),
    customerSnapshot: jsonb("customer_snapshot").$type<CustomerSnapshot>().notNull(),
    addressSnapshot: jsonb("address_snapshot").$type<AddressSnapshot>().notNull(),
    checkoutIdempotencyKey: text("checkout_idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    termsVersion: text("terms_version").notNull(),
    reservationExpiresAt: timestamp("reservation_expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledReason: text("cancelled_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("orders_user_idem_uq").on(t.userId, t.checkoutIdempotencyKey),
    check("orders_currency_ck", sql`${t.currency} = 'SAR'`),
    check("orders_totals_ck", sql`${t.subtotalHalalas} >= 0 and ${t.shippingHalalas} >= 0 and ${t.taxHalalas} >= 0 and ${t.totalHalalas} > 0`),
    check(
      "orders_status_ck",
      sql`${t.orderStatus} in ('PENDING','CONFIRMED','PROCESSING','READY_FOR_SHIPPING','SHIPPED','DELIVERED','CANCELLED','RETURNED','REQUIRES_RECONCILIATION')`,
    ),
    check("orders_payment_status_ck", sql`${t.paymentStatus} in ('PENDING','PAID','FAILED','REFUNDED')`),
    check(
      "orders_shipping_status_ck",
      sql`${t.shippingStatus} in ('NOT_CREATED','CREATED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RETURNED')`,
    ),
    index("orders_user_created_idx").on(t.userId, t.createdAt),
    index("orders_status_created_idx").on(t.orderStatus, t.createdAt),
    index("orders_payment_status_idx").on(t.paymentStatus, t.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
    skuSnapshot: text("sku_snapshot").notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    colorSnapshot: text("color_snapshot").notNull(),
    sizeSnapshot: text("size_snapshot").notNull(),
    purchaseMode: text("purchase_mode").notNull(),
    quantity: integer("quantity").notNull(),
    unitPriceHalalas: integer("unit_price_halalas").notNull(),
    lineTotalHalalas: integer("line_total_halalas").notNull(),
    taxHalalas: integer("tax_halalas").notNull(),
    tierSnapshot: jsonb("tier_snapshot").$type<{ tierId: string; minQty: number; maxQty: number | null } | null>(),
  },
  (t) => [
    check("oi_qty_ck", sql`${t.quantity} > 0`),
    check("oi_mode_ck", sql`${t.purchaseMode} in ('RETAIL','BULK')`),
    index("oi_order_idx").on(t.orderId),
    index("oi_variant_idx").on(t.variantId),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
    /** ORDER | PAYMENT | SHIPPING */
    stream: text("stream").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [index("oe_order_idx").on(t.orderId, t.createdAt)],
);

export const stockReservations = pgTable(
  "stock_reservations",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("res_order_variant_uq").on(t.orderId, t.variantId),
    check("res_qty_ck", sql`${t.quantity} > 0`),
    check("res_status_ck", sql`${t.status} in ('ACTIVE','CONSUMED','RELEASED','EXPIRED')`),
    index("res_active_expiry_idx").on(t.expiresAt).where(sql`${t.status} = 'ACTIVE'`),
    index("res_variant_status_idx").on(t.variantId, t.status),
  ],
);

/* ------------------------------- Payments ------------------------------- */
export const paymentAttempts = pgTable(
  "payment_attempts",
  {
    id: id(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref").unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    amountHalalas: integer("amount_halalas").notNull(),
    currency: text("currency").notNull().default("SAR"),
    /** CREATING | INITIATED | PAID | FAILED */
    status: text("status").notNull().default("CREATING"),
    redirectUrl: text("redirect_url"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("pa_status_ck", sql`${t.status} in ('CREATING','INITIATED','PAID','FAILED')`),
    check("pa_amount_ck", sql`${t.amountHalalas} > 0`),
    index("pa_order_idx").on(t.orderId),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: id(),
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    outcome: text("outcome"),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("webhook_provider_event_uq").on(t.provider, t.eventId)],
);

/* ------------------------------- Shipping ------------------------------- */
export const shipments = pgTable(
  "shipments",
  {
    id: id(),
    orderId: uuid("order_id").notNull().unique().references(() => orders.id, { onDelete: "restrict" }),
    provider: text("provider").notNull(),
    /** PENDING (creation in progress) | DONE | ERROR (retryable) */
    createState: text("create_state").notNull().default("PENDING"),
    awb: text("awb").unique(),
    providerRef: text("provider_ref"),
    labelUrl: text("label_url"),
    status: text("status").notNull().default("NOT_CREATED"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("ship_create_state_ck", sql`${t.createState} in ('PENDING','DONE','ERROR')`),
    index("ship_status_idx").on(t.status, t.lastSyncedAt),
  ],
);

export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: id(),
    shipmentId: uuid("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
    providerEventKey: text("provider_event_key").notNull(),
    status: text("status").notNull(),
    description: text("description").notNull(),
    location: text("location"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("se_shipment_event_uq").on(t.shipmentId, t.providerEventKey),
    index("se_shipment_idx").on(t.shipmentId, t.occurredAt),
  ],
);

/* ----------------------------- Notifications ---------------------------- */
export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: id(),
    eventKey: text("event_key").notNull().unique(),
    kind: text("kind").notNull(),
    recipient: text("recipient").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    /** PENDING | SENDING | SENT | DEAD */
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    check("outbox_status_ck", sql`${t.status} in ('PENDING','SENDING','SENT','DEAD')`),
    index("outbox_due_idx").on(t.nextAttemptAt).where(sql`${t.status} in ('PENDING','SENDING')`),
  ],
);

/* --------------------------- Audit / settings --------------------------- */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

export const storeSettings = pgTable("store_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

/** Merchant-supplied content: about, faq, policies (shipping/returns/privacy/terms). */
export const contentPages = pgTable("content_pages", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  /** Merchant/legal approval flag. Unapproved pages render a visible "draft" notice. */
  approved: boolean("approved").notNull().default(false),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: updatedAt(),
});

export const supportRequests = pgTable(
  "support_requests",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("OPEN"),
    createdAt: createdAt(),
  },
  (t) => [index("support_created_idx").on(t.createdAt)],
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [unique("wishlist_user_variant_uq").on(t.userId, t.variantId), index("wishlist_user_idx").on(t.userId, t.createdAt)],
);
