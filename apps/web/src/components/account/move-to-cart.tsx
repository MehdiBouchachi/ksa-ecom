"use client";

import { cart } from "@/components/cart/cart-store";

export function MoveToCart({ variantId, label, removeAction }: { variantId: string; label: string; removeAction: () => Promise<void> }) {
  return (
    <button
      type="button"
      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      onClick={async () => {
        cart.add({ variantId, quantity: 1, purchaseMode: "RETAIL", label });
        await removeAction();
      }}
    >
      نقل إلى السلة
    </button>
  );
}
