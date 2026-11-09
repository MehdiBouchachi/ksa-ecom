import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { colors, inventory, orders, productVariants, sizes } from "../db/schema";
import { getSetting } from "../lib/settings";

/** Deliberately basic metrics (no BI/forecasting). */
export async function getDashboard(days = 30) {
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const { lowStockThreshold } = await getSetting("commerce");
  const [revenue, byStatus, recent, lowStock] = await Promise.all([
    db
      .select({ revenue: sql<number>`coalesce(sum(${orders.totalHalalas}),0)::bigint`, paidOrders: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.paymentStatus, "PAID"), gte(orders.paidAt, since))),
    db.select({ status: orders.orderStatus, n: sql<number>`count(*)::int` }).from(orders).groupBy(orders.orderStatus),
    db
      .select({ id: orders.id, reference: orders.reference, orderStatus: orders.orderStatus, paymentStatus: orders.paymentStatus, shippingStatus: orders.shippingStatus, totalHalalas: orders.totalHalalas, createdAt: orders.createdAt })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(10),
    db
      .select({ variantId: productVariants.id, sku: productVariants.sku, color: colors.name, size: sizes.name, onHand: inventory.onHand, reserved: inventory.reserved })
      .from(inventory)
      .innerJoin(productVariants, eq(productVariants.id, inventory.variantId))
      .innerJoin(colors, eq(colors.id, productVariants.colorId))
      .innerJoin(sizes, eq(sizes.id, productVariants.sizeId))
      .where(and(eq(productVariants.active, true), lte(sql`${inventory.onHand} - ${inventory.reserved}`, lowStockThreshold)))
      .orderBy(sql`${inventory.onHand} - ${inventory.reserved}`)
      .limit(20),
  ]);
  return {
    periodDays: days,
    revenueHalalas: Number(revenue[0]?.revenue ?? 0),
    paidOrders: revenue[0]?.paidOrders ?? 0,
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>,
    recent,
    lowStock: lowStock.map((r) => ({ ...r, available: r.onHand - r.reserved })),
  };
}
