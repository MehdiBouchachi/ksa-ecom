import type { Executor } from "../db";
import { notificationOutbox } from "../db/schema";

export type NotificationKind =
  | "ORDER_RECEIVED"
  | "PAYMENT_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_CANCELLED"
  | "PASSWORD_RESET"
  | "SUPPORT_REQUEST"
  | "STAFF_ALERT";

/**
 * Transactional outbox insert, deduplicated by business event key.
 * Call inside the same DB transaction as the business change; sending happens later (cron).
 */
export async function enqueueNotification(
  exec: Executor,
  n: { eventKey: string; kind: NotificationKind; recipient: string; payload: Record<string, unknown> },
): Promise<boolean> {
  const rows = await exec
    .insert(notificationOutbox)
    .values({ eventKey: n.eventKey, kind: n.kind, recipient: n.recipient, payload: n.payload })
    .onConflictDoNothing({ target: notificationOutbox.eventKey })
    .returning({ id: notificationOutbox.id });
  return rows.length > 0;
}
