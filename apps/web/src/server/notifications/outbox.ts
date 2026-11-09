import { and, eq, inArray, lte, or, sql } from "drizzle-orm";
import { getDb, withTx } from "../db";
import { notificationOutbox } from "../db/schema";
import { log } from "../lib/log";
import { getSetting } from "../lib/settings";
import { appUrl } from "../payments/registry";
import { getMailer } from "./mailer";
import { render } from "./templates";

const MAX_ATTEMPTS = 8;
const LEASE_MS = 5 * 60_000;

export type OutboxReport = { claimed: number; sent: number; retried: number; dead: number };

/**
 * Signed cron: POST /api/v1/cron/outbox. Claims due rows with FOR UPDATE SKIP LOCKED (batch worker
 * pattern), leases them, sends OUTSIDE the transaction, then records result. Exponential backoff;
 * SENT rows are never re-sent; event_key uniqueness prevents duplicate enqueue.
 */
export async function processOutbox(limit = 20): Promise<OutboxReport> {
  const report: OutboxReport = { claimed: 0, sent: 0, retried: 0, dead: 0 };
  const now = new Date();
  const claimed = await withTx(async (tx) => {
    const rows = await tx
      .select()
      .from(notificationOutbox)
      .where(
        or(
          and(eq(notificationOutbox.status, "PENDING"), lte(notificationOutbox.nextAttemptAt, now)),
          and(eq(notificationOutbox.status, "SENDING"), lte(notificationOutbox.lockedUntil, now)),
        ),
      )
      .orderBy(notificationOutbox.nextAttemptAt)
      .limit(Math.min(limit, 100))
      .for("update", { skipLocked: true });
    if (rows.length) {
      await tx
        .update(notificationOutbox)
        .set({ status: "SENDING", lockedUntil: new Date(now.getTime() + LEASE_MS), attempts: sql`${notificationOutbox.attempts} + 1` })
        .where(inArray(notificationOutbox.id, rows.map((r) => r.id)));
    }
    return rows;
  });
  report.claimed = claimed.length;
  if (!claimed.length) return report;

  const store = await getSetting("store");
  const mailer = getMailer();
  for (const row of claimed) {
    try {
      const msg = render(row.kind, row.payload, { appUrl: appUrl(), storeName: store.name });
      await mailer.send(row.recipient, msg);
      await getDb()
        .update(notificationOutbox)
        .set({ status: "SENT", sentAt: new Date(), lockedUntil: null, lastError: null })
        .where(and(eq(notificationOutbox.id, row.id), eq(notificationOutbox.status, "SENDING")));
      report.sent++;
    } catch (e) {
      const attempts = row.attempts + 1;
      const dead = attempts >= MAX_ATTEMPTS;
      const backoffMs = Math.min(60 * 60_000, 30_000 * 2 ** (attempts - 1));
      await getDb()
        .update(notificationOutbox)
        .set({
          status: dead ? "DEAD" : "PENDING",
          lockedUntil: null,
          nextAttemptAt: new Date(Date.now() + backoffMs),
          lastError: String((e as Error).message).slice(0, 500),
        })
        .where(eq(notificationOutbox.id, row.id));
      if (dead) report.dead++;
      else report.retried++;
      log.warn("outbox.send_failed", { id: row.id, kind: row.kind, attempts });
    }
  }
  log.info("cron.outbox", report);
  return report;
}
