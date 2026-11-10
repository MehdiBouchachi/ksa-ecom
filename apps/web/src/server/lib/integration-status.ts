import "server-only";

/**
 * Read-only integration status for the Admin settings page.
 * Returns only coarse states derived from configuration; never values, hosts or secrets.
 */
export type IntegrationState = "live" | "sandbox" | "missing";

export function integrationStatus() {
  const env = process.env;
  const payment = env.PAYMENT_PROVIDER ?? "mock";
  const shipping = env.SHIPPING_PROVIDER ?? "aramex-mock";
  const ssl = env.DATABASE_SSL ?? (env.NODE_ENV === "production" ? "verify-full" : "disable");
  return {
    payment: (payment === "mock" ? "sandbox" : "live") as IntegrationState,
    shipping: (shipping.endsWith("-mock") || shipping === "mock" ? "sandbox" : "live") as IntegrationState,
    email: (env.SMTP_URL ? "live" : "missing") as IntegrationState,
    database: (ssl === "verify-full" ? "live" : ssl === "require" ? "sandbox" : "missing") as IntegrationState,
    // Durable media storage is not wired yet (staff paste https URLs); see docs/STATE.md blockers.
    media: "missing" as IntegrationState,
  };
}
