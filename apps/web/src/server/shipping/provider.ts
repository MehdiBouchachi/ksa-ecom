import type { ShipmentStatus } from "@saudi-ecom/contracts";

/**
 * Aramex adapter boundary. Real credentials, account number/PIN/entity/country and sender
 * details are supplied by the merchant (PENDING). The adapter must be validated against the
 * Aramex sandbox before live use.
 */
export type CreateShipmentInput = {
  orderReference: string;
  /** Stable reference sent to Aramex to avoid duplicate AWBs on retry. */
  idempotencyKey: string;
  consignee: { name: string; phone: string; email: string; city: string; district: string; street: string; building: string; postalCode: string };
  pieces: number;
  descriptionOfGoods: string;
  codAmountHalalas?: number;
};

export type TrackingEvent = { key: string; status: ShipmentStatus; description: string; location?: string; occurredAt: Date };

export interface ShippingProvider {
  readonly name: string;
  createShipment(input: CreateShipmentInput): Promise<{ awb: string; providerRef: string; labelUrl?: string }>;
  track(awb: string): Promise<TrackingEvent[]>;
}
