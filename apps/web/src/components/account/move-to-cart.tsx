"use client";

import { cart } from "@/components/cart/cart-store";

export function MoveToCart({ variantId, label, removeAction }: { variantId: string; label: string; removeAction: () => Promise<void> }) {
  return (
    <button
      type="button"
      className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-white"
      onClick={async () => {
        cart.add({ variantId, quantity: 1, purchaseMode: "RETAIL", label });
        await removeAction();
      }}
    >
      نقل إلى السلة
    </button>
  );
}
