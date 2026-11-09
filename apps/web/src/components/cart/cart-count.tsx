"use client";

import { useCart } from "./cart-store";

export function CartCount() {
  const n = useCart().reduce((a, l) => a + l.quantity, 0);
  if (!n) return null;
  return (
    <span className="absolute -top-1 -start-1 min-w-5 rounded-full bg-primary px-1 text-center text-[11px] leading-5 text-white" aria-label={`${n} قطع في السلة`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
