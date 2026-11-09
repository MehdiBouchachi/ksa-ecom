import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, pgErrorCode, withTx, type Tx } from "../db";
import { auditLogs, orderEvents, orderItems, orders, paymentAttempts, stockReservations, webhookEvents } from "../db/schema";
import { allocateWithoutReservation, consumeReservations, releaseReservations } from "../inventory";
import { AppError } from "../lib/errors";
import { log } from "../lib/log";
import { enqueueNotification } from "../notifications/enqueue";
import type { VerifiedPaymentEvent } from "./provider";
import { appUrl, getPaymentProvider } from "./registry";

async function lockOrder(tx: Tx, where: ReturnType<typeof eq>) {
  const [o] = await tx.select().from(orders).where(where).for("update");
  return o;
}

/**
 * POST /api/v1/checkout/payment-session.
 * Owner-scoped. Creates (or returns) the hosted PSP session AFTER the checkout transaction has
 * committed; the DB transaction is never held open across the provider HTTP call.
 */
export async function createPaymentSession(userId: string, orderReference: string): Promise<{ redirectUrl: string; providerRef: string; alreadyPaid?: boolean }> {
  const provider = getPaymentProvider();

  const prep = await withTx(async (tx) => {
    const o = await lockOrder(tx, and(eq(orders.reference, orderReference), eq(orders.userId, userId))!);
    if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود");
    if (o.paymentStatus === "PAID") return { kind: "paid" as const };
    if (o.orderStatus !== "PENDING" || o.paymentStatus !== "PENDING") throw new AppError("ORDER_EXPIRED", "انتهت صلاحية هذا الطلب، يرجى إعادة الطلب");
    if (o.reservationExpiresAt.getTime() <= Date.now()) throw new AppError("ORDER_EXPIRED", "انتهت مدة حجز المنتجات، يرجى إعادة الطلب");

    const attempts = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.orderId, o.id)).orderBy(desc(paymentAttempts.createdAt));
    const live = attempts.find((a) => a.status === "INITIATED" && a.redirectUrl && a.providerRef);
    if (live) return { kind: "existing" as const, redirectUrl: live.redirectUrl!, providerRef: live.providerRef! };
    const creating = attempts.find((a) => a.status === "CREATING");
    const attempt =
      creating ??
      (
        await tx
          .insert(paymentAttempts)
          .values({
            orderId: o.id,
            provider: provider.name,
            idempotencyKey: `pay_${o.id}_${attempts.length + 1}`,
            amountHalalas: o.totalHalalas,
            currency: "SAR",
          })
          .returning()
      )[0]!;
    return { kind: "create" as const, order: o, attempt };
  });

  if (prep.kind === "paid") return { redirectUrl: `${appUrl()}/checkout/result?ref=${encodeURIComponent(orderReference)}`, providerRef: "", alreadyPaid: true };
  if (prep.kind === "existing") return { redirectUrl: prep.redirectUrl, providerRef: prep.providerRef };

  const { order, attempt } = prep;
  try {
    const s = await provider.createSession({
      orderId: order.id,
      orderReference: order.reference,
      amountHalalas: attempt.amountHalalas,
      currency: "SAR",
      idempotencyKey: attempt.idempotencyKey,
      customer: order.customerSnapshot,
      returnUrl: `${appUrl()}/checkout/result?ref=${encodeURIComponent(order.reference)}`,
      callbackUrl: `${appUrl()}/api/v1/webhooks/payment`,
    });
    await getDb()
      .update(paymentAttempts)
      .set({ providerRef: s.providerRef, redirectUrl: s.redirectUrl, status: "INITIATED", updatedAt: new Date() })
      .where(and(eq(paymentAttempts.id, attempt.id), eq(paymentAttempts.status, "CREATING")));
    return s;
  } catch (e) {
    // Keep the attempt in CREATING with the SAME idempotency key so a retry cannot double-charge.
    await getDb().update(paymentAttempts).set({ lastError: String((e as Error).message).slice(0, 300), updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
    log.warn("payment.session_failed", { orderId: order.id, err: (e as Error).message });
    if (e instanceof AppError) throw e;
    throw new AppError("PROVIDER_UNAVAILABLE", "تعذر الاتصال بمزود الدفع، حاول مرة أخرى");
  }
}

export type ApplyOutcome =
  | "DUPLICATE"
  | "PAID"
  | "ALREADY_PAID"
  | "LATE_PAID_REALLOCATED"
  | "LATE_PAID_REQUIRES_RECONCILIATION"
  | "DUPLICATE_CAPTURE_REQUIRES_REFUND"
  | "AMOUNT_MISMATCH"
  | "UNKNOWN_PAYMENT"
  | "FAILED_RELEASED"
  | "FAILED_IGNORED";

/**
 * Applies a VERIFIED provider event exactly once.
 * Dedupe: INSERT webhook_events ... ON CONFLICT DO NOTHING inside the same transaction as the
 * business effects, so a crash rolls back both and the provider's redelivery is processed cleanly.
 */
export async function applyPaymentEvent(providerName: string, ev: VerifiedPaymentEvent): Promise<ApplyOutcome> {
  return withTx(async (tx) => {
    const inserted = await tx
      .insert(webhookEvents)
      .values({ provider: providerName, eventId: ev.eventId, eventType: ev.eventType, payload: ev.raw as object })
      .onConflictDoNothing({ target: [webhookEvents.provider, webhookEvents.eventId] })
      .returning({ id: webhookEvents.id });
    if (!inserted.length) return "DUPLICATE";
    const eventRowId = inserted[0]!.id;
    const finish = async (outcome: ApplyOutcome) => {
      await tx.update(webhookEvents).set({ outcome }).where(eq(webhookEvents.id, eventRowId));
      return outcome;
    };

    // Deterministic lock order: payment attempt -> order -> reservations -> inventory.
    const [attempt] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.providerRef, ev.providerRef)).for("update");
    if (!attempt) {
      log.warn("payment.unknown_ref", { providerRef: ev.providerRef });
      return finish("UNKNOWN_PAYMENT");
    }
    const o = await lockOrder(tx, eq(orders.id, attempt.orderId));
    if (!o) return finish("UNKNOWN_PAYMENT");

    if (ev.status === "PAID") {
      if (ev.currency !== "SAR" || ev.amountHalalas !== attempt.amountHalalas || ev.amountHalalas !== o.totalHalalas || ev.orderReference !== o.reference) {
        await tx.insert(auditLogs).values({
          action: "payment.amount_mismatch",
          entity: "order",
          entityId: o.id,
          data: { expected: o.totalHalalas, got: ev.amountHalalas, currency: ev.currency, ref: ev.orderReference },
        });
        if (o.orderStatus === "PENDING") {
          await tx.update(orders).set({ orderStatus: "REQUIRES_RECONCILIATION", updatedAt: new Date() }).where(eq(orders.id, o.id));
          await tx.insert(orderEvents).values({ orderId: o.id, stream: "ORDER", fromStatus: o.orderStatus, toStatus: "REQUIRES_RECONCILIATION", note: "payment amount/currency/reference mismatch" });
        }
        return finish("AMOUNT_MISMATCH");
      }

      if (o.paymentStatus === "PAID") {
        if (attempt.status !== "PAID") {
          // A second, different attempt was captured for an already-paid order => refund needed.
          await tx.update(paymentAttempts).set({ status: "PAID", updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
          await tx.insert(auditLogs).values({ action: "payment.duplicate_capture", entity: "order", entityId: o.id, data: { attemptId: attempt.id } });
          return finish("DUPLICATE_CAPTURE_REQUIRES_REFUND");
        }
        return finish("ALREADY_PAID");
      }

      await tx.update(paymentAttempts).set({ status: "PAID", updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
      const now = new Date();
      const active = await tx
        .select({ id: stockReservations.id })
        .from(stockReservations)
        .where(and(eq(stockReservations.orderId, o.id), eq(stockReservations.status, "ACTIVE")));

      let outcome: ApplyOutcome;
      let nextOrderStatus: string;
      if (active.length) {
        await consumeReservations(tx, o.id);
        outcome = "PAID";
        nextOrderStatus = "CONFIRMED";
      } else {
        // Late payment: hold already released/expired. Re-allocate only if stock is genuinely available.
        const lines = await tx.select({ variantId: orderItems.variantId, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, o.id));
        const ok = await allocateWithoutReservation(tx, o.id, lines);
        outcome = ok ? "LATE_PAID_REALLOCATED" : "LATE_PAID_REQUIRES_RECONCILIATION";
        nextOrderStatus = ok ? "CONFIRMED" : "REQUIRES_RECONCILIATION";
        await tx.insert(auditLogs).values({ action: "payment.late_capture", entity: "order", entityId: o.id, data: { reallocated: ok } });
      }

      await tx
        .update(orders)
        .set({ paymentStatus: "PAID", orderStatus: nextOrderStatus, paidAt: now, cancelledReason: null, updatedAt: now })
        .where(eq(orders.id, o.id));
      await tx.insert(orderEvents).values([
        { orderId: o.id, stream: "PAYMENT", fromStatus: o.paymentStatus, toStatus: "PAID", note: `provider ${providerName} ${ev.providerRef}` },
        { orderId: o.id, stream: "ORDER", fromStatus: o.orderStatus, toStatus: nextOrderStatus, note: outcome },
      ]);
      if (nextOrderStatus === "CONFIRMED") {
        await enqueueNotification(tx, {
          eventKey: `payment-confirmed:${o.id}`,
          kind: "PAYMENT_CONFIRMED",
          recipient: o.customerSnapshot.email,
          payload: { orderReference: o.reference, totalHalalas: o.totalHalalas, name: o.customerSnapshot.name },
        });
      } else {
        await enqueueNotification(tx, {
          eventKey: `staff-reconcile:${o.id}`,
          kind: "STAFF_ALERT",
          recipient: process.env.STAFF_ALERT_EMAIL ?? "ops@localhost",
          payload: { orderReference: o.reference, reason: "Late payment captured but stock unavailable — refund or manual allocation required" },
        });
      }
      return finish(outcome);
    }

    // FAILED (verified terminal failure from provider)
    if (attempt.status === "PAID" || o.paymentStatus === "PAID") return finish("FAILED_IGNORED"); // out-of-order: paid wins
    await tx.update(paymentAttempts).set({ status: "FAILED", updatedAt: new Date() }).where(eq(paymentAttempts.id, attempt.id));
    // Another attempt still in flight for this order? Then keep the hold.
    const otherLive = await tx
      .select({ id: paymentAttempts.id })
      .from(paymentAttempts)
      .where(and(eq(paymentAttempts.orderId, o.id), inArray(paymentAttempts.status, ["CREATING", "INITIATED"])));
    if (otherLive.length || o.orderStatus !== "PENDING") return finish("FAILED_IGNORED");

    await releaseReservations(tx, o.id, "RELEASED");
    await tx
      .update(orders)
      .set({ paymentStatus: "FAILED", orderStatus: "CANCELLED", cancelledReason: "payment failed", updatedAt: new Date() })
      .where(eq(orders.id, o.id));
    await tx.insert(orderEvents).values([
      { orderId: o.id, stream: "PAYMENT", fromStatus: o.paymentStatus, toStatus: "FAILED", note: ev.providerRef },
      { orderId: o.id, stream: "ORDER", fromStatus: o.orderStatus, toStatus: "CANCELLED", note: "payment failed; stock released" },
    ]);
    return finish("FAILED_RELEASED");
  });
}

/** Webhook entry point: verify -> apply. Signature failures never touch the database. */
export async function handlePaymentWebhook(rawBody: string, headers: Headers): Promise<ApplyOutcome> {
  const provider = getPaymentProvider();
  let ev: VerifiedPaymentEvent;
  try {
    ev = provider.verifyWebhook(rawBody, headers);
  } catch (e) {
    log.warn("payment.webhook_rejected", { reason: (e as Error).message });
    throw new AppError("FORBIDDEN", "invalid webhook");
  }
  try {
    const outcome = await applyPaymentEvent(provider.name, ev);
    log.info("payment.webhook_applied", { eventId: ev.eventId, outcome });
    return outcome;
  } catch (e) {
    if (pgErrorCode(e) === "23505") return "DUPLICATE"; // concurrent duplicate delivery lost the race
    throw e;
  }
}

/** Customer-facing status (never trusts browser return URL). Owner-scoped. */
export async function getCheckoutStatus(userId: string, orderReference: string) {
  const [o] = await getDb()
    .select({
      reference: orders.reference,
      orderStatus: orders.orderStatus,
      paymentStatus: orders.paymentStatus,
      shippingStatus: orders.shippingStatus,
      totalHalalas: orders.totalHalalas,
      reservationExpiresAt: orders.reservationExpiresAt,
      id: orders.id,
    })
    .from(orders)
    .where(and(eq(orders.reference, orderReference), eq(orders.userId, userId)))
    .limit(1);
  if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود");
  return o;
}
