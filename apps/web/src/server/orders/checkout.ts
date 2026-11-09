import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { CheckoutPrepareInput, CheckoutPrepareResult } from "@saudi-ecom/contracts";
import { getDb, pgConstraint, pgErrorCode, withTx } from "../db";
import { orderEvents, orderItems, orders, stockReservations } from "../db/schema";
import { reserveAll } from "../inventory";
import { AppError } from "../lib/errors";
import { log } from "../lib/log";
import { getSetting } from "../lib/settings";
import { enqueueNotification } from "../notifications/enqueue";
import { computeQuote, loadVariantPricing, normalizeLines } from "../pricing";
import { newOrderReference } from "./reference";

/** Stable hash of the semantic request, used to detect Idempotency-Key reuse with a different body. */
export function checkoutRequestHash(input: CheckoutPrepareInput): string {
  const items = normalizeLines(input.items).sort((a, b) =>
    a.variantId === b.variantId ? a.purchaseMode.localeCompare(b.purchaseMode) : a.variantId.localeCompare(b.variantId),
  );
  const canonical = JSON.stringify({
    items: items.map((i) => [i.variantId, i.purchaseMode, i.quantity]),
    c: [input.customer.name, input.customer.email, input.customer.phone],
    a: [input.shippingAddress.city, input.shippingAddress.district, input.shippingAddress.street, input.shippingAddress.building, input.shippingAddress.postalCode],
    t: input.acceptedTermsVersion,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

async function loadPrepared(orderId: string): Promise<CheckoutPrepareResult> {
  const db = getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return {
    orderReference: o.reference,
    orderId: o.id,
    currency: "SAR",
    items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitPriceHalalas: i.unitPriceHalalas, lineTotalHalalas: i.lineTotalHalalas })),
    subtotalHalalas: o.subtotalHalalas,
    shippingHalalas: o.shippingHalalas,
    taxHalalas: o.taxHalalas,
    totalHalalas: o.totalHalalas,
    paymentStatus: "PENDING",
    reservationExpiresAt: o.reservationExpiresAt.toISOString(),
  };
}

async function findByKey(userId: string, key: string) {
  const [o] = await getDb()
    .select({ id: orders.id, requestHash: orders.requestHash })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.checkoutIdempotencyKey, key)))
    .limit(1);
  return o;
}

/**
 * POST /api/v1/checkout/prepare — one PostgreSQL transaction:
 * recompute prices server-side, lock inventory rows (sorted, FOR UPDATE), reserve all-or-nothing,
 * insert PENDING order + immutable snapshots + reservations + outbox, COMMIT.
 * No external HTTP calls happen inside the transaction.
 */
export async function prepareCheckout(
  user: { id: string },
  input: CheckoutPrepareInput,
  idempotencyKey: string,
): Promise<{ result: CheckoutPrepareResult; replayed: boolean }> {
  const requestHash = checkoutRequestHash(input);

  const prior = await findByKey(user.id, idempotencyKey);
  if (prior) {
    if (prior.requestHash !== requestHash) throw new AppError("IDEMPOTENCY_KEY_REUSED", "تم استخدام مفتاح العملية لطلب مختلف");
    return { result: await loadPrepared(prior.id), replayed: true };
  }

  try {
    const orderId = await withTx(async (tx) => {
      const commerce = await getSetting("commerce", tx);
      if (input.acceptedTermsVersion !== commerce.termsVersion) {
        throw new AppError("VALIDATION_FAILED", "يجب الموافقة على أحدث نسخة من الشروط والأحكام", { termsVersion: commerce.termsVersion });
      }
      const variants = await loadVariantPricing(input.items.map((i) => i.variantId), tx);
      const quote = computeQuote(input.items, variants, commerce);

      const need = new Map<string, number>();
      for (const l of quote.items) need.set(l.variantId, (need.get(l.variantId) ?? 0) + l.quantity);
      await reserveAll(tx, need); // throws STOCK_UNAVAILABLE -> full rollback

      const expiresAt = new Date(Date.now() + commerce.reservationMinutes * 60_000);
      const [order] = await tx
        .insert(orders)
        .values({
          reference: newOrderReference(),
          userId: user.id,
          subtotalHalalas: quote.subtotalHalalas,
          shippingHalalas: quote.shippingHalalas,
          taxHalalas: quote.taxHalalas,
          totalHalalas: quote.totalHalalas,
          pricesIncludeVat: quote.pricesIncludeVat,
          vatRateBps: quote.vatRateBps,
          customerSnapshot: input.customer,
          addressSnapshot: input.shippingAddress,
          checkoutIdempotencyKey: idempotencyKey,
          requestHash,
          termsVersion: input.acceptedTermsVersion,
          reservationExpiresAt: expiresAt,
        })
        .returning({ id: orders.id, reference: orders.reference });

      await tx.insert(orderItems).values(
        quote.items.map((l) => {
          const v = variants.get(l.variantId)!;
          return {
            orderId: order!.id,
            variantId: l.variantId,
            skuSnapshot: v.sku,
            nameSnapshot: v.productName,
            colorSnapshot: v.colorName,
            sizeSnapshot: v.sizeName,
            purchaseMode: l.purchaseMode,
            quantity: l.quantity,
            unitPriceHalalas: l.unitPriceHalalas,
            lineTotalHalalas: l.lineTotalHalalas,
            taxHalalas: l.taxHalalas,
            tierSnapshot: l.tierId ? { tierId: l.tierId, minQty: l.tierMinQty!, maxQty: l.tierMaxQty } : null,
          };
        }),
      );
      await tx.insert(stockReservations).values(
        [...need.entries()].map(([variantId, quantity]) => ({ orderId: order!.id, variantId, quantity, expiresAt })),
      );
      await tx.insert(orderEvents).values({ orderId: order!.id, stream: "ORDER", toStatus: "PENDING", actorId: user.id, note: "checkout prepared" });
      await enqueueNotification(tx, {
        eventKey: `order-received:${order!.id}`,
        kind: "ORDER_RECEIVED",
        recipient: input.customer.email,
        payload: { orderReference: order!.reference, totalHalalas: quote.totalHalalas, name: input.customer.name },
      });
      return order!.id;
    });
    log.info("checkout.prepared", { orderId });
    return { result: await loadPrepared(orderId), replayed: false };
  } catch (e) {
    // Concurrent duplicate submit with the same key: the loser hits the unique constraint and rolls back.
    if (pgErrorCode(e) === "23505" && pgConstraint(e) === "orders_user_idem_uq") {
      const again = await findByKey(user.id, idempotencyKey);
      if (again && again.requestHash === requestHash) return { result: await loadPrepared(again.id), replayed: true };
      throw new AppError("IDEMPOTENCY_KEY_REUSED", "تم استخدام مفتاح العملية لطلب مختلف");
    }
    throw e;
  }
}
