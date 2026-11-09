import { and, asc, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { canAdvanceShipment, canTransition, ORDER_TRANSITIONS, type OrderStatus, type ShipmentStatus } from "@saudi-ecom/contracts";
import { getDb, withTx, type Tx } from "../db";
import { auditLogs, orderEvents, orderItems, orders, shipmentEvents, shipments } from "../db/schema";
import { AppError } from "../lib/errors";
import { log } from "../lib/log";
import { enqueueNotification } from "../notifications/enqueue";
import { getShippingProvider } from "./registry";

const ELIGIBLE: OrderStatus[] = ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPPING"];
const CREATE_LEASE_MS = 2 * 60_000;

/**
 * Creates exactly one Aramex shipment per order (ACC-13):
 *  - shipments.order_id UNIQUE + order row lock serialize concurrent admin clicks;
 *  - a stable provider idempotency key (ship_<orderId>) is reused on every retry;
 *  - the provider HTTP call happens outside any DB transaction.
 */
export async function createShipmentForOrder(orderId: string, actorId: string) {
  const provider = getShippingProvider();
  const prep = await withTx(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o) throw new AppError("NOT_FOUND", "الطلب غير موجود");
    if (o.paymentStatus !== "PAID" || !ELIGIBLE.includes(o.orderStatus as OrderStatus)) {
      throw new AppError("INVALID_STATE_TRANSITION", "يمكن إنشاء شحنة للطلبات المدفوعة والمؤكدة فقط");
    }
    const [existing] = await tx.select().from(shipments).where(eq(shipments.orderId, orderId)).for("update");
    const now = new Date();
    if (existing?.createState === "DONE") return { kind: "exists" as const, shipment: existing, order: o };
    if (existing?.createState === "PENDING" && existing.lockedUntil && existing.lockedUntil > now) {
      throw new AppError("CONFLICT", "جاري إنشاء الشحنة بالفعل");
    }
    const lease = new Date(now.getTime() + CREATE_LEASE_MS);
    let shipment;
    if (existing) {
      [shipment] = await tx
        .update(shipments)
        .set({ createState: "PENDING", lockedUntil: lease, attempts: sql`${shipments.attempts} + 1`, updatedAt: now })
        .where(eq(shipments.id, existing.id))
        .returning();
    } else {
      [shipment] = await tx.insert(shipments).values({ orderId, provider: provider.name, createState: "PENDING", lockedUntil: lease, attempts: 1 }).returning();
    }
    const qty = await tx.select({ q: sql<number>`coalesce(sum(${orderItems.quantity}),0)::int` }).from(orderItems).where(eq(orderItems.orderId, orderId));
    return { kind: "create" as const, shipment: shipment!, order: o, pieces: qty[0]?.q ?? 1 };
  });

  if (prep.kind === "exists") return { shipment: prep.shipment, created: false };

  const o = prep.order;
  let result;
  try {
    result = await provider.createShipment({
      orderReference: o.reference,
      idempotencyKey: `ship_${o.id}`,
      consignee: { ...o.customerSnapshot, ...o.addressSnapshot },
      pieces: prep.pieces,
      descriptionOfGoods: "Apparel",
    });
  } catch (e) {
    await getDb()
      .update(shipments)
      .set({ createState: "ERROR", lastError: String((e as Error).message).slice(0, 500), lockedUntil: null, updatedAt: new Date() })
      .where(eq(shipments.id, prep.shipment.id));
    log.warn("shipping.create_failed", { orderId, err: (e as Error).message });
    throw new AppError("PROVIDER_UNAVAILABLE", "تعذر إنشاء الشحنة لدى أرامكس، يمكن إعادة المحاولة");
  }

  const shipment = await withTx(async (tx) => {
    const [ord] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    const [s] = await tx
      .update(shipments)
      .set({ createState: "DONE", awb: result.awb, providerRef: result.providerRef, labelUrl: result.labelUrl ?? null, status: "CREATED", lockedUntil: null, lastError: null, updatedAt: new Date() })
      .where(eq(shipments.id, prep.shipment.id))
      .returning();
    await tx
      .insert(shipmentEvents)
      .values({ shipmentId: s!.id, providerEventKey: `${result.awb}:created`, status: "CREATED", description: "تم إنشاء الشحنة", occurredAt: new Date() })
      .onConflictDoNothing();
    const nextOrder: OrderStatus | null = canTransition(ORDER_TRANSITIONS, ord!.orderStatus as OrderStatus, "READY_FOR_SHIPPING") ? "READY_FOR_SHIPPING" : null;
    await tx
      .update(orders)
      .set({ shippingStatus: "CREATED", ...(nextOrder ? { orderStatus: nextOrder } : {}), updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({ orderId, stream: "SHIPPING", fromStatus: ord!.shippingStatus, toStatus: "CREATED", actorId, note: `AWB ${result.awb}` });
    if (nextOrder) await tx.insert(orderEvents).values({ orderId, stream: "ORDER", fromStatus: ord!.orderStatus, toStatus: nextOrder, actorId });
    await tx.insert(auditLogs).values({ actorId, action: "shipment.create", entity: "order", entityId: orderId, data: { awb: result.awb } });
    await enqueueNotification(tx, {
      eventKey: `order-shipped:${orderId}`,
      kind: "ORDER_SHIPPED",
      recipient: ord!.customerSnapshot.email,
      payload: { orderReference: ord!.reference, awb: result.awb },
    });
    return s!;
  });
  return { shipment, created: true };
}

const ORDER_FOR_SHIPMENT: Partial<Record<ShipmentStatus, OrderStatus>> = {
  PICKED_UP: "SHIPPED",
  IN_TRANSIT: "SHIPPED",
  OUT_FOR_DELIVERY: "SHIPPED",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
};

async function applyTracking(tx: Tx, shipmentId: string, events: Awaited<ReturnType<ReturnType<typeof getShippingProvider>["track"]>>) {
  const [s] = await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for("update");
  if (!s) return;
  let status = s.status as ShipmentStatus;
  for (const ev of [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())) {
    await tx
      .insert(shipmentEvents)
      .values({ shipmentId, providerEventKey: ev.key, status: ev.status, description: ev.description, location: ev.location ?? null, occurredAt: ev.occurredAt })
      .onConflictDoNothing();
    if (canAdvanceShipment(status, ev.status)) status = ev.status; // out-of-order events never move status backwards
  }
  await tx.update(shipments).set({ status, lastSyncedAt: new Date(), updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
  if (status !== s.status) {
    const [o] = await tx.select().from(orders).where(eq(orders.id, s.orderId)).for("update");
    await tx.update(orders).set({ shippingStatus: status, updatedAt: new Date() }).where(eq(orders.id, s.orderId));
    await tx.insert(orderEvents).values({ orderId: s.orderId, stream: "SHIPPING", fromStatus: s.status, toStatus: status });
    const target = ORDER_FOR_SHIPMENT[status];
    let cur = o!.orderStatus as OrderStatus;
    // Walk forward through allowed order transitions (e.g. READY_FOR_SHIPPING -> SHIPPED -> DELIVERED).
    for (const step of ["SHIPPED", "DELIVERED", "RETURNED"] as OrderStatus[]) {
      if (!target) break;
      if (cur === target) break;
      if (canTransition(ORDER_TRANSITIONS, cur, step)) {
        await tx.update(orders).set({ orderStatus: step }).where(eq(orders.id, s.orderId));
        await tx.insert(orderEvents).values({ orderId: s.orderId, stream: "ORDER", fromStatus: cur, toStatus: step, note: "from carrier tracking" });
        cur = step;
      }
      if (step === target) break;
    }
  }
}

export async function refreshShipment(shipmentId: string) {
  const [s] = await getDb().select().from(shipments).where(eq(shipments.id, shipmentId));
  if (!s) throw new AppError("NOT_FOUND", "الشحنة غير موجودة");
  if (!s.awb) throw new AppError("INVALID_STATE_TRANSITION", "لا يوجد رقم بوليصة بعد");
  const events = await getShippingProvider().track(s.awb);
  await withTx((tx) => applyTracking(tx, s.id, events));
  const [after] = await getDb().select().from(shipments).where(eq(shipments.id, shipmentId));
  return after!;
}

/** Signed cron: POST /api/v1/cron/shipping-sync — bounded batch of active shipments. */
export async function syncShipments(limit = 25) {
  const staleBefore = new Date(Date.now() - 30 * 60_000);
  const due = await getDb()
    .select({ id: shipments.id })
    .from(shipments)
    .where(
      and(
        eq(shipments.createState, "DONE"),
        inArray(shipments.status, ["CREATED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]),
        or(isNull(shipments.lastSyncedAt), lte(shipments.lastSyncedAt, staleBefore)),
      ),
    )
    .orderBy(asc(shipments.lastSyncedAt))
    .limit(Math.min(limit, 100));
  let ok = 0;
  let failed = 0;
  for (const { id } of due) {
    try {
      await refreshShipment(id);
      ok++;
    } catch (e) {
      failed++;
      log.warn("shipping.sync_failed", { id, err: (e as Error).message });
    }
  }
  const report = { scanned: due.length, synced: ok, failed };
  log.info("cron.shipping_sync", report);
  return report;
}

/** Customer tracking — owner-scoped at query level; returns null for someone else's order. */
export async function getTrackingForUser(userId: string, orderId: string) {
  const [o] = await getDb()
    .select({ id: orders.id, reference: orders.reference, shippingStatus: orders.shippingStatus })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)));
  if (!o) return null;
  const [s] = await getDb().select().from(shipments).where(eq(shipments.orderId, o.id));
  if (!s || !s.awb) return { order: o, shipment: null, events: [] };
  const events = await getDb().select().from(shipmentEvents).where(eq(shipmentEvents.shipmentId, s.id)).orderBy(asc(shipmentEvents.occurredAt));
  return {
    order: o,
    shipment: { awb: s.awb, status: s.status, provider: s.provider, lastSyncedAt: s.lastSyncedAt },
    events: events.map((e) => ({ status: e.status, description: e.description, location: e.location, occurredAt: e.occurredAt })),
  };
}

export async function listShipments(limit = 100) {
  return getDb()
    .select({
      id: shipments.id,
      orderId: shipments.orderId,
      reference: orders.reference,
      awb: shipments.awb,
      status: shipments.status,
      createState: shipments.createState,
      lastError: shipments.lastError,
      attempts: shipments.attempts,
      lastSyncedAt: shipments.lastSyncedAt,
      createdAt: shipments.createdAt,
    })
    .from(shipments)
    .innerJoin(orders, eq(orders.id, shipments.orderId))
    .orderBy(sql`${shipments.createdAt} desc`)
    .limit(limit);
}

/** Paid orders awaiting a shipment. */
export async function listShippableOrders(limit = 100) {
  return getDb()
    .select({ id: orders.id, reference: orders.reference, orderStatus: orders.orderStatus, createdAt: orders.createdAt, city: sql<string>`${orders.addressSnapshot}->>'city'` })
    .from(orders)
    .leftJoin(shipments, eq(shipments.orderId, orders.id))
    .where(and(eq(orders.paymentStatus, "PAID"), inArray(orders.orderStatus, ["CONFIRMED", "PROCESSING", "READY_FOR_SHIPPING"]), or(isNull(shipments.id), sql`${shipments.createState} <> 'DONE'`)))
    .orderBy(asc(orders.createdAt))
    .limit(limit);
}
