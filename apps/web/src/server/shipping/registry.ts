import { AppError } from "../lib/errors";
import { MockAramexProvider } from "./mock-aramex";
import type { ShippingProvider } from "./provider";

let override: ShippingProvider | null = null;
export function setShippingProviderForTests(p: ShippingProvider | null) {
  override = p;
}

export function getShippingProvider(): ShippingProvider {
  if (override) return override;
  const name = process.env.SHIPPING_PROVIDER ?? "aramex-mock";
  if (name === "aramex-mock") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_SHIPPING !== "1") throw new AppError("NOT_CONFIGURED", "Aramex not configured");
    return new MockAramexProvider();
  }
  // "aramex": implement AramexProvider (Shipping Services API: CreateShipments / TrackShipments)
  // once merchant credentials exist, then validate in the Aramex sandbox (ACC-13).
  throw new AppError("NOT_CONFIGURED", `Unknown SHIPPING_PROVIDER "${name}"`);
}
