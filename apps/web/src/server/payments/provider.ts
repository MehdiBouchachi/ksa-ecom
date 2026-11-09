/**
 * One merchant-approved Saudi PSP sits behind this interface (hosted/tokenized checkout only;
 * the app never sees PAN/CVV). Selection is PENDING merchant approval — see docs/STATE.md.
 * Implement a new adapter by satisfying PaymentProvider and registering it in registry.ts.
 */
export type ProviderStatus = "INITIATED" | "PROCESSING" | "PAID" | "FAILED" | "NOT_FOUND";

export type CreateSessionInput = {
  orderId: string;
  orderReference: string;
  amountHalalas: number;
  currency: "SAR";
  /** Stable key so retries never create a second charge at the provider. */
  idempotencyKey: string;
  customer: { name: string; email: string; phone: string };
  returnUrl: string;
  callbackUrl: string;
};

export type VerifiedPaymentEvent = {
  eventId: string;
  eventType: string;
  providerRef: string;
  status: "PAID" | "FAILED";
  amountHalalas: number;
  currency: string;
  orderReference: string;
  raw: unknown;
};

export interface PaymentProvider {
  readonly name: string;
  createSession(input: CreateSessionInput): Promise<{ providerRef: string; redirectUrl: string }>;
  /** Must verify authenticity (signature) and throw on any failure. Never trust unsigned bodies. */
  verifyWebhook(rawBody: string, headers: Headers): VerifiedPaymentEvent;
  /** Server-to-server status lookup used for reconciliation. */
  fetchStatus(providerRef: string): Promise<{ status: ProviderStatus; amountHalalas?: number; currency?: string; orderReference?: string }>;
}
