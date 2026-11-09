import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { withTx, type Tx } from "../db";
import { auditLogs, inventory, inventoryAdjustments, stockReservations } from "../db/schema";
import { AppError } from "../lib/errors";

/*
 * Inventory invariants (per color+size variant), enforced by CHECK constraints AND here:
 *   on_hand >= 0, reserved >= 0, reserved <= on_hand, available = on_hand - reserved.
 * Retail and bulk purchases consume the same rows. All mutations run inside a
 * PostgreSQL transaction holding `SELECT ... FOR UPDATE` locks taken in ascending
 * variant_id order (deterministic => no lock-order deadlocks between checkouts).
 */

export type LockedRow = { variantId: string; onHand: number; reserved: number; version: number };

export async function lockInventoryRows(tx: Tx, variantIds: string[]): Promise<Map<string, LockedRow>> {
  const ids = [...new Set(variantIds)].sort();
  if (!ids.length) return new Map();
  const rows = await tx
    .select({ variantId: inventory.variantId, onHand: inventory.onHand, reserved: inventory.reserved, version: inventory.version })
    .from(inventory)
    .where(inArray(inventory.variantId, ids))
    .orderBy(asc(inventory.variantId))
    .for("update");
  return new Map(rows.map((r) => [r.variantId, r]));
}

/** Reserve all quantities or none. Caller must be inside the checkout transaction. */
export async function reserveAll(tx: Tx, need: Map<string, number>): Promise<void> {
  const locked = await lockInventoryRows(tx, [...need.keys()]);
  const short: { variantId: string; requested: number; available: number }[] = [];
  for (const [variantId, qty] of need) {
    const row = locked.get(variantId);
    const available = row ? row.onHand - row.reserved : 0;
    if (!row || available < qty) short.push({ variantId, requested: qty, available: Math.max(0, available) });
  }
  if (short.length) {
    // Throwing rolls back the whole transaction: the entire cart fails atomically.
    throw new AppError("STOCK_UNAVAILABLE", "الكمية المطلوبة غير متوفرة حاليًا", { items: short });
  }
  for (const [variantId, qty] of [...need.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    await tx
      .update(inventory)
      .set({ reserved: sql`${inventory.reserved} + ${qty}`, version: sql`${inventory.version} + 1`, updatedAt: new Date() })
      .where(eq(inventory.variantId, variantId));
  }
}

type ReservationRow = { id: string; variantId: string; quantity: number; status: string };

async function lockReservations(tx: Tx, orderId: string): Promise<ReservationRow[]> {
  return tx
    .select({ id: stockReservations.id, variantId: stockReservations.variantId, quantity: stockReservations.quantity, status: stockReservations.status })
    .from(stockReservations)
    .where(eq(stockReservations.orderId, orderId))
    .orderBy(asc(stockReservations.variantId))
    .for("update");
}

/**
 * Converts ACTIVE reservations into sold stock exactly once:
 * on_hand -= qty, reserved -= qty; reservation -> CONSUMED.
 * Returns the number of reservations consumed (0 if already consumed).
 */
export async function consumeReservations(tx: Tx, orderId: string): Promise<number> {
  const res = (await lockReservations(tx, orderId)).filter((r) => r.status === "ACTIVE");
  if (!res.length) return 0;
  await lockInventoryRows(tx, res.map((r) => r.variantId));
  for (const r of res) {
    const [row] = await tx
      .update(inventory)
      .set({
        onHand: sql`${inventory.onHand} - ${r.quantity}`,
        reserved: sql`${inventory.reserved} - ${r.quantity}`,
        version: sql`${inventory.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.variantId, r.variantId))
      .returning({ onHand: inventory.onHand, reserved: inventory.reserved });
    await tx
      .update(stockReservations)
      .set({ status: "CONSUMED", updatedAt: new Date() })
      .where(and(eq(stockReservations.id, r.id), eq(stockReservations.status, "ACTIVE")));
    await tx.insert(inventoryAdjustments).values({
      variantId: r.variantId,
      delta: -r.quantity,
      kind: "SALE",
      reason: "order paid",
      onHandAfter: row!.onHand,
      reservedAfter: row!.reserved,
      orderId,
    });
  }
  return res.length;
}

/** Release ACTIVE reservations exactly once (reserved -= qty). */
export async function releaseReservations(tx: Tx, orderId: string, to: "RELEASED" | "EXPIRED"): Promise<number> {
  const res = (await lockReservations(tx, orderId)).filter((r) => r.status === "ACTIVE");
  if (!res.length) return 0;
  await lockInventoryRows(tx, res.map((r) => r.variantId));
  for (const r of res) {
    await tx
      .update(inventory)
      .set({ reserved: sql`${inventory.reserved} - ${r.quantity}`, version: sql`${inventory.version} + 1`, updatedAt: new Date() })
      .where(eq(inventory.variantId, r.variantId));
    await tx.update(stockReservations).set({ status: to, updatedAt: new Date() }).where(eq(stockReservations.id, r.id));
  }
  return res.length;
}

/**
 * Late payment after the hold was released: try to allocate directly from available stock.
 * Returns true if every line could be allocated (stock decremented), false otherwise (nothing changed).
 */
export async function allocateWithoutReservation(tx: Tx, orderId: string, lines: { variantId: string; quantity: number }[]): Promise<boolean> {
  const need = new Map<string, number>();
  for (const l of lines) need.set(l.variantId, (need.get(l.variantId) ?? 0) + l.quantity);
  const locked = await lockInventoryRows(tx, [...need.keys()]);
  for (const [variantId, qty] of need) {
    const row = locked.get(variantId);
    if (!row || row.onHand - row.reserved < qty) return false;
  }
  for (const [variantId, qty] of [...need.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [row] = await tx
      .update(inventory)
      .set({ onHand: sql`${inventory.onHand} - ${qty}`, version: sql`${inventory.version} + 1`, updatedAt: new Date() })
      .where(eq(inventory.variantId, variantId))
      .returning({ onHand: inventory.onHand, reserved: inventory.reserved });
    await tx.insert(inventoryAdjustments).values({
      variantId,
      delta: -qty,
      kind: "SALE",
      reason: "late payment re-allocation",
      onHandAfter: row!.onHand,
      reservedAfter: row!.reserved,
      orderId,
    });
  }
  return true;
}

/** Restock sold units for a cancelled/returned paid order — at most once per order+variant (unique index). */
export async function restockOrder(
  tx: Tx,
  orderId: string,
  lines: { variantId: string; quantity: number }[],
  kind: "CANCEL_RESTOCK" | "RETURN_RESTOCK",
  actorId: string | null,
): Promise<number> {
  const need = new Map<string, number>();
  for (const l of lines) need.set(l.variantId, (need.get(l.variantId) ?? 0) + l.quantity);
  await lockInventoryRows(tx, [...need.keys()]);
  let n = 0;
  for (const [variantId, qty] of [...need.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const existing = await tx
      .select({ id: inventoryAdjustments.id })
      .from(inventoryAdjustments)
      .where(and(eq(inventoryAdjustments.orderId, orderId), eq(inventoryAdjustments.variantId, variantId), inArray(inventoryAdjustments.kind, ["CANCEL_RESTOCK", "RETURN_RESTOCK"])))
      .limit(1);
    if (existing.length) continue; // never double-restock
    const [row] = await tx
      .update(inventory)
      .set({ onHand: sql`${inventory.onHand} + ${qty}`, version: sql`${inventory.version} + 1`, updatedAt: new Date() })
      .where(eq(inventory.variantId, variantId))
      .returning({ onHand: inventory.onHand, reserved: inventory.reserved });
    await tx.insert(inventoryAdjustments).values({
      variantId,
      delta: qty,
      kind,
      reason: kind === "CANCEL_RESTOCK" ? "order cancelled" : "order returned",
      onHandAfter: row!.onHand,
      reservedAfter: row!.reserved,
      orderId,
      actorId,
    });
    n++;
  }
  return n;
}

/**
 * Manual, audited stock adjustment (Admin/Manager). Row-locked; rejects any change that would
 * make on_hand negative or push on_hand below currently reserved units.
 */
export async function adjustStock(params: { variantId: string; delta: number; reason: string; actorId: string }) {
  return withTx(async (tx) => {
    const locked = await lockInventoryRows(tx, [params.variantId]);
    const row = locked.get(params.variantId);
    if (!row) throw new AppError("INVALID_VARIANT", "لا يوجد سجل مخزون لهذا الخيار");
    const nextOnHand = row.onHand + params.delta;
    if (nextOnHand < 0) throw new AppError("CONFLICT", "لا يمكن أن يصبح المخزون سالبًا", { onHand: row.onHand });
    if (nextOnHand < row.reserved) {
      throw new AppError("CONFLICT", "لا يمكن خفض المخزون تحت الكمية المحجوزة لطلبات قيد الدفع", { onHand: row.onHand, reserved: row.reserved });
    }
    const [updated] = await tx
      .update(inventory)
      .set({ onHand: nextOnHand, version: sql`${inventory.version} + 1`, updatedAt: new Date() })
      .where(eq(inventory.variantId, params.variantId))
      .returning();
    await tx.insert(inventoryAdjustments).values({
      variantId: params.variantId,
      delta: params.delta,
      kind: params.delta > 0 ? "RESTOCK" : "ADJUSTMENT",
      reason: params.reason,
      onHandAfter: updated!.onHand,
      reservedAfter: updated!.reserved,
      actorId: params.actorId,
    });
    await tx.insert(auditLogs).values({
      actorId: params.actorId,
      action: "inventory.adjust",
      entity: "inventory",
      entityId: params.variantId,
      data: { delta: params.delta, reason: params.reason, before: row.onHand, after: updated!.onHand },
    });
    return { variantId: params.variantId, onHand: updated!.onHand, reserved: updated!.reserved, available: updated!.onHand - updated!.reserved };
  });
}
