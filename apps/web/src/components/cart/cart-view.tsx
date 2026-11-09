"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatSAR, type Quote } from "@saudi-ecom/contracts";
import { cart, useCart } from "./cart-store";

type QuoteState = { quote: Quote | null; error: { message: string; variantId?: string } | null; loading: boolean };

export function useQuote() {
  const lines = useCart();
  const [s, setS] = useState<QuoteState>({ quote: null, error: null, loading: false });
  const sig = JSON.stringify(lines.map((l) => [l.variantId, l.quantity, l.purchaseMode]));
  useEffect(() => {
    if (!lines.length) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setS((p) => ({ ...p, loading: true }));
      try {
        const r = await fetch("/api/v1/pricing/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ items: lines.map(({ variantId, quantity, purchaseMode }) => ({ variantId, quantity, purchaseMode })) }),
          signal: ctrl.signal,
        });
        const j = await r.json();
        if (r.ok) setS({ quote: j.data, error: null, loading: false });
        else setS({ quote: null, error: { message: j.error?.message ?? "تعذر حساب السعر", variantId: j.error?.details?.variantId }, loading: false });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setS({ quote: null, error: { message: "تعذر الاتصال بالخادم" }, loading: false });
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  return { lines, ...(lines.length ? s : { quote: null, error: null, loading: false }) };
}

export function Totals({ quote }: { quote: Quote }) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between"><dt>المجموع الفرعي</dt><dd>{formatSAR(quote.subtotalHalalas)}</dd></div>
      <div className="flex justify-between"><dt>الشحن</dt><dd>{quote.shippingHalalas === 0 ? "مجاني" : formatSAR(quote.shippingHalalas)}</dd></div>
      <div className="flex justify-between text-muted-foreground">
        <dt>ضريبة القيمة المضافة ({quote.vatRateBps / 100}%){quote.pricesIncludeVat ? " — مشمولة" : ""}</dt>
        <dd>{formatSAR(quote.taxHalalas)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>الإجمالي</dt><dd>{formatSAR(quote.totalHalalas)}</dd></div>
    </dl>
  );
}

export function CartView() {
  const { lines, quote, error, loading } = useQuote();
  if (!lines.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="font-semibold">سلتك فارغة</p>
        <Link href="/products" className="mt-4 inline-block rounded-md bg-primary px-5 py-3 font-semibold text-white">تصفح المنتجات</Link>
      </div>
    );
  }
  const byKey = new Map(quote?.items.map((i) => [`${i.variantId}|${i.purchaseMode}`, i]));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {lines.map((l) => {
          const q = byKey.get(`${l.variantId}|${l.purchaseMode}`);
          const bad = error?.variantId === l.variantId;
          return (
            <li key={`${l.variantId}-${l.purchaseMode}`} className={`flex flex-wrap items-center gap-3 p-4 ${bad ? "bg-red-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{l.label ?? "منتج"}</p>
                <p className="text-sm text-muted-foreground">{l.purchaseMode === "BULK" ? "جملة" : "تجزئة"}{q ? ` · ${formatSAR(q.unitPriceHalalas)} للقطعة` : ""}{q?.tierMinQty ? ` (شريحة ${q.tierMinQty}${q.tierMaxQty ? `–${q.tierMaxQty}` : "+"})` : ""}</p>
              </div>
              <label className="sr-only" htmlFor={`q-${l.variantId}-${l.purchaseMode}`}>الكمية</label>
              <input
                id={`q-${l.variantId}-${l.purchaseMode}`}
                type="number"
                min={1}
                inputMode="numeric"
                value={l.quantity}
                onChange={(e) => cart.setQty(l.variantId, l.purchaseMode, Number(e.target.value) || 1)}
                className="min-h-11 w-24 rounded-md border border-input bg-card px-2"
              />
              <span className="w-28 text-end font-semibold">{q ? formatSAR(q.lineTotalHalalas) : "—"}</span>
              <button type="button" onClick={() => cart.remove(l.variantId, l.purchaseMode)} className="min-h-11 rounded-md px-3 text-sm text-destructive hover:bg-red-50">حذف</button>
            </li>
          );
        })}
      </ul>
      <aside className="h-fit rounded-lg border border-border bg-card p-5" aria-live="polite">
        <h2 className="mb-3 font-bold">ملخص الطلب (تقديري)</h2>
        {loading && !quote && <p className="text-sm text-muted-foreground">جارٍ الحساب…</p>}
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error.message}</p>}
        {quote && <Totals quote={quote} />}
        <Link
          href="/checkout"
          aria-disabled={!quote}
          className={`mt-4 flex min-h-12 items-center justify-center rounded-md bg-primary font-semibold text-white ${quote ? "" : "pointer-events-none opacity-50"}`}
        >
          إتمام الطلب
        </Link>
        <p className="mt-2 text-xs text-muted-foreground">السلة لا تحجز المنتجات. يتم تأكيد السعر والتوفر عند إتمام الطلب.</p>
      </aside>
    </div>
  );
}
