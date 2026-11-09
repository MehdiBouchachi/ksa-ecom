"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { cart } from "./cart-store";

/** Refreshes the server-verified status while pending; clears the cart once payment is verified. */
export function ResultPoller({ paid, pending }: { paid: boolean; pending: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (paid) cart.clear();
    if (!pending) return;
    const id = setInterval(() => router.refresh(), 4000);
    const stop = setTimeout(() => clearInterval(id), 120_000);
    return () => {
      clearInterval(id);
      clearTimeout(stop);
    };
  }, [paid, pending, router]);
  return null;
}
