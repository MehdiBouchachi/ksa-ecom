import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "سلة التسوق", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <>
      <h1 className="mb-6 text-[28px] font-bold tracking-tight md:mb-8 md:text-4xl">سلة التسوق</h1>
      <CartView />
    </>
  );
}
