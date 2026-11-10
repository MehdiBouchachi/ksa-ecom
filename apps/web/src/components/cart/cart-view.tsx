"use client";

import Link from "next/link";
import { Lock, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { btnPrimary, btnSecondary, StoreEmpty } from "@/components/store/ui";
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
    <dl className="space-y-3 text-[15px]">
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">المجموع الفرعي</dt><dd className="font-medium">{formatSAR(quote.subtotalHalalas)}</dd></div>
      <div className="flex justify-between gap-4"><dt className="text-muted-foreground">الشحن</dt><dd className="font-medium">{quote.shippingHalalas === 0 ? "مجاني" : formatSAR(quote.shippingHalalas)}</dd></div>
      <div className="flex justify-between gap-4 text-sm text-muted-foreground">
        <dt>ضريبة القيمة المضافة ({quote.vatRateBps / 100}%){quote.pricesIncludeVat ? " — مشمولة" : ""}</dt>
        <dd>{formatSAR(quote.taxHalalas)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-4 text-lg font-bold"><dt>الإجمالي</dt><dd>{formatSAR(quote.totalHalalas)}</dd></div>
    </dl>
  );
}

/** "Product — Colour / Size" (label saved at add-to-cart time) → hierarchy. */
function splitLabel(label?: string) {
  if (!label) return { name: "منتج", option: "" };
  const i = label.lastIndexOf(" — ");
  return i === -1 ? { name: label, option: "" } : { name: label.slice(0, i), option: label.slice(i + 3) };
}

export function CartView() {
  const { lines, quote, error, loading } = useQuote();
  if (!lines.length) {
    return (
      <StoreEmpty
        icon={<ShoppingBag className="size-7" aria-hidden />}
        title="سلتك فارغة"
        body="اختر اللون والمقاس من التشكيلة، وسيظهر طلبك هنا."
        action={<Link href="/products" className={btnPrimary}>تصفح التشكيلات</Link>}
      />
    );
  }
  const byKey = new Map(quote?.items.map((i) => [`${i.variantId}|${i.purchaseMode}`, i]));
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <ul className="divide-y divide-border border-y border-border">
        {lines.map((l) => {
          const q = byKey.get(`${l.variantId}|${l.purchaseMode}`);
          const bad = error?.variantId === l.variantId;
          const { name, option } = splitLabel(l.label);
          const id = `q-${l.variantId}-${l.purchaseMode}`;
          return (
            <li key={`${l.variantId}-${l.purchaseMode}`} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 py-5 ${bad ? "-mx-3 rounded-lg bg-destructive-soft px-3" : ""}`}>
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{name}</p>
                {option && <p className="mt-0.5 text-sm text-muted-foreground">{option}</p>}
                <p className="mt-1.5 text-sm text-muted-foreground">
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">{l.purchaseMode === "BULK" ? "جملة" : "تجزئة"}</span>
                  {q ? ` ${formatSAR(q.unitPriceHalalas)} للقطعة` : ""}
                  {q?.tierMinQty ? ` (شريحة ${q.tierMinQty}${q.tierMaxQty ? `–${q.tierMaxQty}` : "+"})` : ""}
                </p>
              </div>
              <p className="text-end text-base font-bold">{q ? formatSAR(q.lineTotalHalalas) : "—"}</p>
              <div className="col-span-2 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-border bg-card">
                  <button type="button" onClick={() => cart.setQty(l.variantId, l.purchaseMode, Math.max(1, l.quantity - 1))} className="grid size-11 place-items-center rounded-s-lg hover:bg-muted" aria-label={`إنقاص كمية ${name}`}><Minus className="size-4" aria-hidden /></button>
                  <label className="sr-only" htmlFor={id}>الكمية</label>
                  <input
                    id={id}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={l.quantity}
                    onChange={(e) => cart.setQty(l.variantId, l.purchaseMode, Number(e.target.value) || 1)}
                    className="h-11 w-16 border-x border-border bg-transparent text-center font-semibold [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring/40 [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button" onClick={() => cart.setQty(l.variantId, l.purchaseMode, l.quantity + 1)} className="grid size-11 place-items-center rounded-e-lg hover:bg-muted" aria-label={`زيادة كمية ${name}`}><Plus className="size-4" aria-hidden /></button>
                </div>
                <button type="button" onClick={() => cart.remove(l.variantId, l.purchaseMode)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-destructive-soft hover:text-destructive">
                  <Trash2 className="size-4" aria-hidden /> حذف
                </button>
              </div>
              {bad && error && <p role="alert" className="col-span-2 text-sm text-destructive">{error.message}</p>}
            </li>
          );
        })}
      </ul>
      <aside className="h-fit rounded-2xl bg-muted/70 p-6 lg:sticky lg:top-24" aria-live="polite">
        <h2 className="mb-5 text-lg font-bold">ملخص الطلب</h2>
        {loading && !quote && <div className="space-y-3" aria-label="جارٍ الحساب…">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-5" />)}</div>}
        {error && !error.variantId && <p role="alert" className="mb-3 text-sm text-destructive">{error.message}</p>}
        {quote && <Totals quote={quote} />}
        <Link href="/checkout" aria-disabled={!quote} className={`${btnPrimary} mt-6 w-full ${quote ? "" : "pointer-events-none opacity-50"}`}>
          متابعة لإتمام الطلب
        </Link>
        <Link href="/products" className={`${btnSecondary} mt-2 w-full border-transparent bg-transparent`}>متابعة التسوق</Link>
        <p className="mt-4 flex gap-2 text-xs leading-5 text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          تقدير مبدئي: يتم تأكيد السعر والتوفر عند إتمام الطلب، والسلة لا تحجز المنتجات.
        </p>
      </aside>
    </div>
  );
}
