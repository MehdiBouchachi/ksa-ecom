import { AppError } from "../lib/errors";
import { MockPaymentProvider } from "./mock-provider";
import type { PaymentProvider } from "./provider";

let override: PaymentProvider | null = null;

/** Test hook. */
export function setPaymentProviderForTests(p: PaymentProvider | null) {
  override = p;
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function getPaymentProvider(): PaymentProvider {
  if (override) return override;
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  switch (name) {
    case "mock": {
      if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "1") {
        throw new AppError("NOT_CONFIGURED", "Payment provider not configured");
      }
      const secret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (!secret) throw new AppError("NOT_CONFIGURED", "PAYMENT_WEBHOOK_SECRET missing");
      return new MockPaymentProvider(secret, appUrl());
    }
    // case "moyasar": case "hyperpay": case "tap": ... — add the merchant-approved adapter here.
    default:
      throw new AppError("NOT_CONFIGURED", `Unknown PAYMENT_PROVIDER "${name}"`);
  }
}
