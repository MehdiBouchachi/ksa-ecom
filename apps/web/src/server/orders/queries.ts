import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { canTransition, ORDER_STATUSES, ORDER_TRANSITIONS, type OrderStatus, type Role } from "@saudi-ecom/contracts";
import { getDb, withTx } from "../db";
import { auditLogs, orderEvents, orderItems, orders, paymentAttempts, shipmentEvents, shipments, stockReservations } from "../db/schema";
import { releaseReservations, restockOrder } from "../inventory";
import { AppError } from "../lib/errors";
import { enqueueNotification } from "../notifications/enqueue";

/* --------------------------- Customer (owner-scoped) --------------------------- */

export async function listOrdersForUser(userId: string, page = 1, pageSize = 20) {
  const db = getDb();
  const where = eq(orders.userId, userId);
  const [rows, total] = await Promise.all([
    db
      .select({
        id: orders.id,
        reference: orders.reference,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        shippingStatus: orders.shippingStatus,
        totalHalalas: orders.totalHalalas,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(orders).where(where),
  ]);
  return { items: rows, total: total[0]?.n ?? 0, page, pageSize };
}

/** Returns null (=> 404) when the order belongs to someone else. Ownership is in the WHERE clause. */
export async function getOrderForUser(userId: string, orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const db = getDb();
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1);
  if (!o) return null;
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(asc(orderEvents.createdAt)),
  ]);
  return {
    id: o.id,
    reference: o.reference,
    orderStatus: o.orderStatus,
    paymentStatus: o.paymentStatus,
    shippingStatus: o.shippingStatus,
    currency: o.currency,
    subtotalHalalas: o.subtotalHalalas,
    shippingHalalas: o.shippingHalalas,
    taxHalalas: o.taxHalalas,
    totalHalalas: o.totalHalalas,
    pricesIncludeVat: o.pricesIncludeVat,
    vatRateBps: o.vatRateBps,
    address: o.addressSnapshot,
    customer: o.customerSnapshot,
    createdAt: o.createdAt,
    paidAt: o.paidAt,
    items: items.map((i) => ({
      sku: i.skuSnapshot,
      name: i.nameSnapshot,
      color: i.colorSnapshot,
      size: i.sizeSnapshot,
      purchaseMode: i.purchaseMode,
      quantity: i.quantity,
      unitPriceHalalas: i.unitPriceHalalas,
      lineTotalHalalas: i.lineTotalHalalas,
      taxHalalas: i.taxHalalas,
      tier: i.tierSnapshot,
    })),
    timeline: events.map((e) => ({ stream: e.stream, from: e.fromStatus, to: e.toStatus, at: e.createdAt })),
  };
}

/* ---------------------------- Back office (staff) ----------------------------- */

export async function listOrdersAdmin(opts: { status?: string; payment?: string; q?: string; page?: number; pageSize?: number }) {
  const page = opts.page ?? 1;
  const pageSize = Math.min(opts.pageSize ?? 25, 100);
  const conds: SQL[] = [];
  if (opts.status && (ORDER_STATUSES as readonly string[]).includes(opts.status)) conds.push(eq(orders.orderStatus, opts.status));
  if (opts.payment) conds.push(eq(orders.paymentStatus, opts.payment));
  if (opts.q) {
    const like = `%${opts.q.replace(/[\\%_]/g, "\\$&")}%`;
    // Search by reference or name embedded in the order (no access to the user directory).
    conds.push(or(ilike(orders.reference, like), sql`${orders.customerSnapshot}->>'name' ilike ${like}`)!);
  }
  const where = conds.length ? and(...conds) : undefined;
  const db = getDb();
  const [rows, total] = await Promise.all([
    db
      .select({
        id: orders.id,
        reference: orders.reference,
        customerName: sql<string>`${orders.customerSnapshot}->>'name'`,
        orderStatus: orders.orderStatus,
        paymentStatus: orders.paymentStatus,
        shippingStatus: orders.shippingStatus,
        totalHalalas: orders.totalHalalas,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(orders).where(where),
  ]);
  return { items: rows, total: total[0]?.n ?? 0, page, pageSize };
}

/** Staff order view: includes delivery contact *embedded in this order* (allowed for Managers). */
export async function getOrderAdmin(orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const db = getDb();
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) return null;
  const [items, events, attempts, [shipment], reservations] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(asc(orderEvents.createdAt)),
    db
      .select({ id: paymentAttempts.id, provider: paymentAttempts.provider, providerRef: paymentAttempts.providerRef, status: paymentAttempts.status, amountHalalas: paymentAttempts.amountHalalas, createdAt: paymentAttempts.createdAt })
      .from(paymentAttempts)
      .where(eq(paymentAttempts.orderId, o.id)),
    db.select().from(shipments).where(eq(shipments.orderId, o.id)),
    db.select().from(stockReservations).where(eq(stockReservations.orderId, o.id)),
  ]);
  const shipEvents = shipment ? await db.select().from(shipmentEvents).where(eq(shipmentEvents.shipmentId, shipment.id)).orderBy(asc(shipmentEvents.occurredAt)) : [];
  // Deliberately omit user_id linkage details beyond the snapshot: no profile browsing from here.
  const { userId: _omit, requestHash: _h, checkoutIdempotencyKey: _k, ...safe } = o;
  void _omit;
  void _h;
  void _k;
  return { order: safe, items, events, attempts, shipment: shipment ?? null, shipmentEvents: shipEvents, reservations };
}

/** Manual order status change by staff with transition validation. Payment-driven moves are not manual. */
export async function changeOrderStatus(orderId: string, to: OrderStatus, actor: { id: string; role: Role }, note?: string) {
  return withTx(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود");
    const from = o.orderStatus as OrderStatus;
    if (to === "CANCELLED") throw new AppError("INVALID_STATE_TRANSITION", "استخدم إجراء الإلغاء");
    if (from === "PENDING") throw new AppError("INVALID_STATE_TRANSITION", "لا يمكن تأكيد طلب قبل التحقق من الدفع");
    if (from === "REQUIRES_RECONCILIATION" && actor.role !== "ADMIN") throw new AppError("FORBIDDEN", "معالجة التسوية للمدير فقط");
    if (!canTransition(ORDER_TRANSITIONS, from, to)) throw new AppError("INVALID_STATE_TRANSITION", `لا يمكن الانتقال من ${from} إلى ${to}`);
    if (o.paymentStatus !== "PAID") throw new AppError("INVALID_STATE_TRANSITION", "الطلب غير مدفوع");
    if (to === "RETURNED") {
      const lines = await tx.select({ variantId: orderItems.variantId, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, o.id));
      await restockOrder(tx, o.id, lines, "RETURN_RESTOCK", actor.id);
    }
    await tx.update(orders).set({ orderStatus: to, updatedAt: new Date() }).where(eq(orders.id, o.id));
    await tx.insert(orderEvents).values({ orderId: o.id, stream: "ORDER", fromStatus: from, toStatus: to, actorId: actor.id, note: note ?? null });
    await tx.insert(auditLogs).values({ actorId: actor.id, action: "order.status", entity: "order", entityId: o.id, data: { from, to, note } });
    return { id: o.id, orderStatus: to };
  });
}

/**
 * Cancel policy: PENDING orders release their hold; paid orders before shipment restock once
 * (if restock=true) and are flagged for a refund via the PSP's supported workflow (not automatic).
 */
export async function cancelOrder(orderId: string, actor: { id: string }, reason: string, restock = true) {
  return withTx(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود");
    const from = o.orderStatus as OrderStatus;
    if (!canTransition(ORDER_TRANSITIONS, from, "CANCELLED")) throw new AppError("INVALID_STATE_TRANSITION", "لا يمكن إلغاء الطلب في حالته الحالية");
    const released = await releaseReservations(tx, o.id, "RELEASED");
    let restocked = 0;
    if (o.paymentStatus === "PAID" && restock) {
      const lines = await tx.select({ variantId: orderItems.variantId, quantity: orderItems.quantity }).from(orderItems).where(eq(orderItems.orderId, o.id));
      restocked = await restockOrder(tx, o.id, lines, "CANCEL_RESTOCK", actor.id);
    }
    await tx.update(orders).set({ orderStatus: "CANCELLED", cancelledReason: reason, updatedAt: new Date() }).where(eq(orders.id, o.id));
    await tx.insert(orderEvents).values({ orderId: o.id, stream: "ORDER", fromStatus: from, toStatus: "CANCELLED", actorId: actor.id, note: reason });
    await tx.insert(auditLogs).values({
      actorId: actor.id,
      action: "order.cancel",
      entity: "order",
      entityId: o.id,
      data: { reason, released, restocked, refundRequired: o.paymentStatus === "PAID" },
    });
    await enqueueNotification(tx, { eventKey: `order-cancelled:${o.id}`, kind: "ORDER_CANCELLED", recipient: o.customerSnapshot.email, payload: { orderReference: o.reference, reason } });
    return { id: o.id, released, restocked, refundRequired: o.paymentStatus === "PAID" };
  });
}
