"use client";

import { useSyncExternalStore } from "react";
import type { PurchaseMode } from "@saudi-ecom/contracts";

/**
 * Browser cart (localStorage). It holds ONLY variant ids, quantities and modes — never prices.
 * Browsing/cart never reserves stock; the server reserves at checkout preparation.
 */
export type CartLine = { variantId: string; quantity: number; purchaseMode: PurchaseMode; label?: string };

const KEY = "cart:v1";
const listeners = new Set<() => void>();
let cache: CartLine[] | null = null;
const EMPTY: CartLine[] = [];

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(raw)
      ? raw.filter((l) => typeof l?.variantId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0 && (l.purchaseMode === "RETAIL" || l.purchaseMode === "BULK"))
      : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage unavailable: keep in memory */
  }
  listeners.forEach((l) => l());
}

export const cart = {
  get: read,
  add(line: CartLine) {
    const lines = [...read()];
    const i = lines.findIndex((l) => l.variantId === line.variantId && l.purchaseMode === line.purchaseMode);
    if (i >= 0) lines[i] = { ...lines[i]!, quantity: lines[i]!.quantity + line.quantity, label: line.label ?? lines[i]!.label };
    else lines.push(line);
    write(lines);
  },
  setQty(variantId: string, mode: PurchaseMode, quantity: number) {
    write(read().map((l) => (l.variantId === variantId && l.purchaseMode === mode ? { ...l, quantity: Math.max(1, Math.min(100_000, quantity)) } : l)));
  },
  remove(variantId: string, mode: PurchaseMode) {
    write(read().filter((l) => !(l.variantId === variantId && l.purchaseMode === mode)));
  },
  clear() {
    write([]);
  },
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
