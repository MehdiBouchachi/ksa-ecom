import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { getDb, withTx } from "../db";
import { orderEvents, orders, paymentAttempts, stockReservations } from "../db/schema";
import { releaseReservations } from "../inventory";
import { log } from "../lib/log";
import { enqueueNotification } from "../notifications/enqueue";
import { applyPaymentEvent } from "../payments/service";
import { getPaymentProvider } from "../payments/registry";

export type ReconcileReport = {
  scanned: number;
  expired: number;
  paidRecovered: number;
  failedReleased: number;
  skippedProcessing: number;
  skippedProviderError: number;
};

/** Grace period after hold expiry before an INITIATED (customer never submitted) session is abandoned. */
const ABANDON_GRACE_MS = Number(process.env.PAYMENT_ABANDON_GRACE_MINUTES ?? 30) * 60_000;

/**
 * Releases a PENDING order's hold exactly once, re-checking everything under row locks.
 * Returns false if the order changed meanwhile (e.g. a paid webhook won the race).
 */
export async function expireOrder(orderId: string, reason: string, paymentFailed = false): Promise<boolean> {
  return withTx(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o || o.orderStatus !== "PENDING" || o.paymentStatus === "PAID") return false;
    const released = await releaseReservations(tx, o.id, "EXPIRED");
    const paymentStatus = paymentFailed ? "FAILED" : o.paymentStatus;
    await tx.update(orders).set({ orderStatus: "CANCELLED", paymentStatus, cancelledReason: reason, updatedAt: new Date() }).where(eq(orders.id, o.id));
    await tx.insert(orderEvents).values({ orderId: o.id, stream: "ORDER", fromStatus: "PENDING", toStatus: "CANCELLED", note: `${reason}; released ${released}` });
    if (paymentFailed) await tx.insert(orderEvents).values({ orderId: o.id, stream: "PAYMENT", fromStatus: o.paymentStatus, toStatus: "FAILED", note: reason });
    await enqueueNotification(tx, {
      eventKey: `order-cancelled:${o.id}`,
      kind: "ORDER_CANCELLED",
      recipient: o.customerSnapshot.email,
      payload: { orderReference: o.reference, reason: "expired" },
    });
    return true;
  });
}

/**
 * Signed cron: POST /api/v1/cron/reconcile. Bounded batch, idempotent, observable report.
 * - No payment attempt: release at expiry.
 * - Attempt exists: ask PSP. PAID -> apply (consume). FAILED/NOT_FOUND -> release.
 *   PROCESSING -> never release. INITIATED -> release only after grace period (late capture is
 *   still safe: applyPaymentEvent re-allocates or flags REQUIRES_RECONCILIATION).
 */
export async function reconcileExpiredHolds(opts: { limit?: number; now?: Date } = {}): Promise<ReconcileReport> {
  const now = opts.now ?? new Date();
  const limit = Math.min(opts.limit ?? 50, 200);
  const report: ReconcileReport = { scanned: 0, expired: 0, paidRecovered: 0, failedReleased: 0, skippedProcessing: 0, skippedProviderError: 0 };

  const due = await getDb()
    .selectDistinct({ orderId: stockReservations.orderId, expiresAt: stockReservations.expiresAt })
    .from(stockReservations)
    .innerJoin(orders, eq(orders.id, stockReservations.orderId))
    .where(and(eq(stockReservations.status, "ACTIVE"), lte(stockReservations.expiresAt, now), eq(orders.orderStatus, "PENDING")))
    .orderBy(stockReservations.expiresAt)
    .limit(limit);

  for (const { orderId, expiresAt } of due) {
    report.scanned++;
    const attempts = await getDb()
      .select()
      .from(paymentAttempts)
      .where(and(eq(paymentAttempts.orderId, orderId), inArray(paymentAttempts.status, ["CREATING", "INITIATED"])))
      .orderBy(desc(paymentAttempts.createdAt));
    const withRef = attempts.filter((a) => a.providerRef);

    if (!withRef.length) {
      // CREATING without provider ref: the session call never completed. Give it the grace period.
      if (attempts.length && now.getTime() - expiresAt.getTime() < ABANDON_GRACE_MS) {
        report.skippedProcessing++;
        continue;
      }
      if (await expireOrder(orderId, "payment window expired")) report.expired++;
      continue;
    }

    let provider;
    try {
      provider = getPaymentProvider();
    } catch {
      report.skippedProviderError++;
      continue;
    }

    let anyProcessing = false;
    let anyInitiatedWithinGrace = false;
    let paid = false;
    let allFailed = true;
    for (const a of withRef) {
      let st;
      try {
        st = await provider.fetchStatus(a.providerRef!);
      } catch (e) {
        log.warn("reconcile.provider_error", { orderId, err: (e as Error).message });
        report.skippedProviderError++;
        allFailed = false;
        anyProcessing = true; // unknown => do not release
        continue;
      }
      if (st.status === "PAID") {
        const outcome = await applyPaymentEvent(provider.name, {
          eventId: `reconcile:${a.providerRef}:PAID`,
          eventType: "reconcile.paid",
          providerRef: a.providerRef!,
          status: "PAID",
          amountHalalas: st.amountHalalas ?? -1,
          currency: st.currency ?? "",
          orderReference: st.orderReference ?? "",
          raw: { source: "reconcile", status: st },
        });
        if (outcome === "PAID" || outcome === "LATE_PAID_REALLOCATED") report.paidRecovered++;
        paid = true;
        allFailed = false;
        break;
      }
      if (st.status === "PROCESSING") {
        anyProcessing = true;
        allFailed = false;
      } else if (st.status === "INITIATED") {
        allFailed = false;
        if (now.getTime() - expiresAt.getTime() < ABANDON_GRACE_MS) anyInitiatedWithinGrace = true;
      }
    }
    if (paid) continue;
    if (anyProcessing || anyInitiatedWithinGrace) {
      report.skippedProcessing++;
      continue;
    }
    // Mark attempts failed/abandoned (provider confirmed terminal or abandoned past grace).
    await getDb()
      .update(paymentAttempts)
      .set({ status: "FAILED", lastError: allFailed ? "provider terminal failure" : "abandoned", updatedAt: new Date() })
      .where(and(eq(paymentAttempts.orderId, orderId), inArray(paymentAttempts.status, ["CREATING", "INITIATED"])));
    if (await expireOrder(orderId, allFailed ? "payment failed" : "payment abandoned", allFailed)) {
      if (allFailed) report.failedReleased++;
      else report.expired++;
    }
  }
  log.info("cron.reconcile", report);
  return report;
}

/** Housekeeping: prune old rate-limit windows. */
export async function pruneRateLimits() {
  await getDb().execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`);
}
