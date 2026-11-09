import { describe, expect, it } from "vitest";
import {
  canAdvanceShipment,
  canTransition,
  checkoutPrepareSchema,
  ORDER_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  registerSchema,
  roundHalfUpDiv,
  saudiPhone,
} from "@saudi-ecom/contracts";
import { signPayload, verifySignedPayload } from "@/server/lib/hmac";
import { sslConfig } from "@/server/db";

describe("contracts", () => {
  it("normalizes Saudi mobile numbers", () => {
    expect(saudiPhone.parse("0501234567")).toBe("+966501234567");
    expect(saudiPhone.parse("+966 50 123 4567")).toBe("+966501234567");
    expect(() => saudiPhone.parse("0401234567")).toThrow();
  });
  it("checkout input never accepts prices; unknown fields are stripped", () => {
    const parsed = checkoutPrepareSchema.parse({
      items: [{ variantId: "3f1c2a52-6f1e-4a5e-9b7e-1c2d3e4f5a6b", quantity: 1, purchaseMode: "RETAIL", unitPriceHalalas: 1 }],
      customer: { name: "سارة", email: "S@Example.com", phone: "0501234567" },
      shippingAddress: { city: "جدة", district: "الروضة", street: "شارع 1", building: "5", postalCode: "23435" },
      acceptedTermsVersion: "v1",
      totalHalalas: 1,
    });
    expect(parsed).not.toHaveProperty("totalHalalas");
    expect(parsed.items[0]).not.toHaveProperty("unitPriceHalalas");
    expect(parsed.customer.email).toBe("s@example.com");
  });
  it("sign-up schema has no role field", () => {
    const r = registerSchema.parse({ name: "Ali Test", email: "a@b.co", password: "0123456789", role: "ADMIN" } as never);
    expect(r).not.toHaveProperty("role");
  });
  it("state machines are independent and validated", () => {
    expect(canTransition(ORDER_TRANSITIONS, "PENDING", "SHIPPED")).toBe(false);
    expect(canTransition(ORDER_TRANSITIONS, "CONFIRMED", "PROCESSING")).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, "CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition(PAYMENT_TRANSITIONS, "PAID", "FAILED")).toBe(false);
    expect(canAdvanceShipment("IN_TRANSIT", "PICKED_UP")).toBe(false);
    expect(canAdvanceShipment("CREATED", "DELIVERED")).toBe(true);
    expect(canAdvanceShipment("DELIVERED", "RETURNED")).toBe(true);
  });
  it("half-up integer rounding", () => {
    expect(roundHalfUpDiv(5, 2)).toBe(3);
    expect(roundHalfUpDiv(4, 3)).toBe(1);
  });
});

describe("signatures", () => {
  it("verifies HMAC, rejects tamper and replay", () => {
    const s = "secret-0123456789";
    const h = signPayload(s, "body");
    expect(verifySignedPayload(s, "body", h)).toBe(true);
    expect(verifySignedPayload(s, "body2", h)).toBe(false);
    expect(verifySignedPayload("other", "body", h)).toBe(false);
    expect(verifySignedPayload(s, "body", h, 300, Date.now() + 10 * 60_000)).toBe(false);
    expect(verifySignedPayload(s, "body", null)).toBe(false);
  });
});

describe("database TLS policy", () => {
  it("verifies certificates by default in production and refuses plaintext", () => {
    expect(sslConfig({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toEqual({ rejectUnauthorized: true });
    expect(() => sslConfig({ NODE_ENV: "production", DATABASE_SSL: "disable" } as NodeJS.ProcessEnv)).toThrow();
    expect(sslConfig({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe(false);
  });
});
