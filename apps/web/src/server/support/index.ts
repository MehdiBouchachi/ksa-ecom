import { withTx } from "../db";
import { supportRequests } from "../db/schema";
import { rateLimit } from "../lib/rate-limit";
import { getSetting } from "../lib/settings";
import { enqueueNotification } from "../notifications/enqueue";

export async function submitContact(input: { name: string; email: string; phone?: string; subject: string; message: string }, ip: string, userId: string | null) {
  await rateLimit(`contact:${ip}`, 5, 60 * 60);
  const store = await getSetting("store");
  return withTx(async (tx) => {
    const [row] = await tx
      .insert(supportRequests)
      .values({ ...input, phone: input.phone ?? null, userId })
      .returning({ id: supportRequests.id });
    if (store.email) {
      await enqueueNotification(tx, { eventKey: `support:${row!.id}`, kind: "SUPPORT_REQUEST", recipient: store.email, payload: { ...input } });
    }
    return { id: row!.id };
  });
}
