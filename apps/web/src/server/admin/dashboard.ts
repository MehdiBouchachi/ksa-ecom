import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { colors, inventory, orders, productVariants, sizes } from "../db/schema";
import { getSetting } from "../lib/settings";

export const DASHBOARD_RANGES = [7, 30, 90] as const;

/** Deliberately basic metrics (no BI/forecasting). `days` is clamped to an integer in [1, 365]. */
export async function getDashboard(requestedDays = 30) {
  const days = Math.min(365, Math.max(1, Math.trunc(requestedDays) || 30));
  const db = getDb();
  const since = new Date(Date.now() - days * 86_400_000);
  const prevSince = new Date(Date.now() - 2 * days * 86_400_000);
  const { lowStockThreshold } = await getSetting("commerce");
  // Riyadh-local calendar days, zero-filled. `days` is a whitelisted integer (bound as a parameter).
  const riyadhDay = sql`(${orders.paidAt} at time zone 'Asia/Riyadh')::date`;
  const [revenue, byStatus, recent, lowStock, prev, series] = await Promise.all([
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
    db
      .select({ revenue: sql<number>`coalesce(sum(${orders.totalHalalas}),0)::bigint`, paidOrders: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.paymentStatus, "PAID"), gte(orders.paidAt, prevSince), lt(orders.paidAt, since))),
    db.execute<{ day: string; revenue: string; orders: number }>(sql`
      with days as (
        select generate_series((now() at time zone 'Asia/Riyadh')::date - (${days}::int - 1), (now() at time zone 'Asia/Riyadh')::date, interval '1 day')::date as d
      )
      select to_char(days.d, 'YYYY-MM-DD') as day, coalesce(sum(o.total_halalas), 0)::bigint as revenue, count(o.id)::int as orders
      from days
      left join (select ${orders.id} as id, ${orders.totalHalalas} as total_halalas, ${riyadhDay} as d from ${orders}
                 where ${orders.paymentStatus} = 'PAID' and ${orders.paidAt} >= ${new Date(since.getTime() - 86_400_000)}) o on o.d = days.d
      group by days.d order by days.d`),
  ]);
  return {
    periodDays: days,
    revenueHalalas: Number(revenue[0]?.revenue ?? 0),
    paidOrders: revenue[0]?.paidOrders ?? 0,
    prevRevenueHalalas: Number(prev[0]?.revenue ?? 0),
    prevPaidOrders: prev[0]?.paidOrders ?? 0,
    series: series.rows.map((r) => ({ day: r.day, revenueHalalas: Number(r.revenue), orders: Number(r.orders) })),
    byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])) as Record<string, number>,
    recent,
    lowStock: lowStock.map((r) => ({ ...r, available: r.onHand - r.reserved })),
  };
}
