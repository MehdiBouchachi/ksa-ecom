import { createHash } from "node:crypto";
import { z } from "zod";
import { AppError } from "../lib/errors";
import { verifySignedPayload } from "../lib/hmac";
import type { CreateSessionInput, PaymentProvider, ProviderStatus, VerifiedPaymentEvent } from "./provider";

/**
 * SANDBOX-ONLY mock PSP. Behaves like a hosted checkout with HMAC-signed webhooks so the full
 * flow (session -> redirect -> signed webhook -> reconciliation) is testable before a real PSP is
 * approved. Refuses to run in production unless explicitly allowed for a staging environment.
 */
type Session = { ref: string; orderReference: string; amountHalalas: number; status: ProviderStatus };
const g = globalThis as unknown as { __mockPsp?: Map<string, Session> };
const sessions: Map<string, Session> = (g.__mockPsp ??= new Map());

const webhookBody = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    providerRef: z.string().min(1),
    status: z.enum(["PAID", "FAILED"]),
    amountHalalas: z.number().int(),
    currency: z.string(),
    orderReference: z.string(),
  }),
});

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  constructor(private readonly secret: string, private readonly appUrl: string) {}

  async createSession(input: CreateSessionInput) {
    const ref = "mock_" + createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 24);
    if (!sessions.has(ref)) sessions.set(ref, { ref, orderReference: input.orderReference, amountHalalas: input.amountHalalas, status: "INITIATED" });
    return { providerRef: ref, redirectUrl: `${this.appUrl}/checkout/mock-pay/${ref}` };
  }

  verifyWebhook(rawBody: string, headers: Headers): VerifiedPaymentEvent {
    if (!verifySignedPayload(this.secret, rawBody, headers.get("x-mock-signature"))) {
      throw new AppError("FORBIDDEN", "invalid webhook signature");
    }
    const body = webhookBody.parse(JSON.parse(rawBody));
    return { eventId: body.id, eventType: body.type, ...body.data, raw: body };
  }

  async fetchStatus(providerRef: string) {
    const s = sessions.get(providerRef);
    if (!s) return { status: "NOT_FOUND" as const };
    return { status: s.status, amountHalalas: s.amountHalalas, currency: "SAR", orderReference: s.orderReference };
  }

  /* --- sandbox controls (mock pay page / tests) --- */
  static getSession(ref: string) {
    return sessions.get(ref);
  }
  static setStatus(ref: string, status: ProviderStatus) {
    const s = sessions.get(ref);
    if (s) s.status = status;
  }
  static reset() {
    sessions.clear();
  }
}
