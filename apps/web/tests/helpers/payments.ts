import { randomUUID } from "node:crypto";
import { signPayload } from "@/server/lib/hmac";

export function signedWebhook(data: { providerRef: string; status: "PAID" | "FAILED"; amountHalalas: number; orderReference: string; currency?: string }, eventId = `evt_${randomUUID()}`) {
  const body = JSON.stringify({ id: eventId, type: `payment.${data.status.toLowerCase()}`, data: { currency: "SAR", ...data } });
  const headers = new Headers({ "x-mock-signature": signPayload(process.env.PAYMENT_WEBHOOK_SECRET!, body), "content-type": "application/json" });
  return { body, headers, eventId };
}
