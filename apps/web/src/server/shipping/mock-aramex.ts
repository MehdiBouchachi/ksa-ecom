import { createHash } from "node:crypto";
import type { CreateShipmentInput, ShippingProvider, TrackingEvent } from "./provider";

/** SANDBOX-ONLY stand-in for Aramex. Deterministic AWB per idempotency key; scripted tracking. */
const g = globalThis as unknown as { __mockAramex?: { created: Map<string, string>; calls: number; events: Map<string, TrackingEvent[]> } };
const state = (g.__mockAramex ??= { created: new Map(), calls: 0, events: new Map() });

export class MockAramexProvider implements ShippingProvider {
  readonly name = "aramex-mock";
  async createShipment(input: CreateShipmentInput) {
    state.calls++;
    let awb = state.created.get(input.idempotencyKey);
    if (!awb) {
      const n = BigInt("0x" + createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 12)) % 10_000_000_000n;
      awb = n.toString().padStart(11, "4");
      state.created.set(input.idempotencyKey, awb);
      state.events.set(awb, [{ key: `${awb}:created`, status: "CREATED", description: "تم إنشاء الشحنة", occurredAt: new Date() }]);
    }
    return { awb, providerRef: `ARX-${awb}` };
  }
  async track(awb: string) {
    return state.events.get(awb) ?? [];
  }
  /* sandbox controls */
  static push(awb: string, ev: TrackingEvent) {
    state.events.set(awb, [...(state.events.get(awb) ?? []), ev]);
  }
  static stats() {
    return { calls: state.calls, created: state.created.size };
  }
  static reset() {
    state.created.clear();
    state.events.clear();
    state.calls = 0;
  }
}
