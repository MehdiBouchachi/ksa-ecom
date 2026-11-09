import type { OrderStatus, PaymentStatus, ShipmentStatus } from "@saudi-ecom/contracts";
/** English-ready: mirror of ar.ts keys (partial). Locale routing can be added without touching server modules. */
export const t = {
  nav: { home: "Home", products: "Products", about: "About", faq: "FAQ", contact: "Contact", cart: "Cart", wishlist: "Wishlist", account: "Account", login: "Sign in", logout: "Sign out", admin: "Dashboard" },
  common: { sar: "SAR", addToCart: "Add to cart", buyNow: "Buy now", outOfStock: "Out of stock", inStock: "In stock", lowStock: "Low stock", save: "Save", cancel: "Cancel", search: "Search", apply: "Apply", reset: "Reset", next: "Next", prev: "Previous" },
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  READY_FOR_SHIPPING: "Ready to ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  REQUIRES_RECONCILIATION: "Needs review",
};
export const paymentStatusLabel: Record<PaymentStatus, string> = { PENDING: "Pending", PAID: "Paid", FAILED: "Failed", REFUNDED: "Refunded" };
export const shipmentStatusLabel: Record<ShipmentStatus, string> = {
  NOT_CREATED: "Not created",
  CREATED: "Shipment created",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Delivery failed",
  RETURNED: "Returned",
};
