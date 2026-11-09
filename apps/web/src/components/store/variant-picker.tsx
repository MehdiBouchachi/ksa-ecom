"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatSAR, type PurchaseMode } from "@saudi-ecom/contracts";
import { cart } from "@/components/cart/cart-store";
import type { ProductDetailVariant } from "@/server/catalog";
import { HeartIcon } from "./icons";

type Props = {
  productName: string;
  variants: ProductDetailVariant[];
  colors: { id: string; slug: string; name: string; swatchHex: string }[];
  sizes: { id: string; slug: string; name: string }[];
  initialColorId: string | null;
  lowStockThreshold: number;
};

/** Client-side mirror of the server pricing rules — DISPLAY ONLY. The server re-prices at checkout. */
function previewUnit(v: ProductDetailVariant, mode: PurchaseMode, qty: number): { unit: number | null; error?: string; moq?: number } {
  const tiers = v.tiers.filter((t) => t.mode === mode);
  const hit = tiers.find((t) => qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty));
  if (mode === "RETAIL") return { unit: hit ? hit.unitPriceHalalas : v.retailPriceHalalas };
  if (!tiers.length) return { unit: null, error: "الشراء بالجملة غير متاح لهذا الخيار" };
  const moq = Math.min(...tiers.map((t) => t.minQty));
  if (qty < moq) return { unit: null, error: `الحد الأدنى لطلب الجملة ${moq} قطعة`, moq };
  if (!hit) return { unit: null, error: "الكمية خارج شرائح الجملة" };
  return { unit: hit.unitPriceHalalas, moq };
}

export function VariantPicker({ productName, variants, colors, sizes, initialColorId, lowStockThreshold }: Props) {
  const router = useRouter();
  const [colorId, setColorId] = useState<string | null>(initialColorId ?? colors[0]?.id ?? null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [mode, setMode] = useState<PurchaseMode>("RETAIL");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const variant = useMemo(() => variants.find((v) => v.colorId === colorId && v.sizeId === sizeId) ?? null, [variants, colorId, sizeId]);
  const sizeAvail = (sid: string) => variants.find((v) => v.colorId === colorId && v.sizeId === sid);
  const bulkTiers = variant?.tiers.filter((t) => t.mode === "BULK") ?? [];
  const preview = variant ? previewUnit(variant, mode, qty) : null;
  const tooMany = !!variant && qty > variant.available;
  const canBuy = !!variant && variant.available > 0 && !!preview?.unit && !tooMany;
  const colorName = colors.find((c) => c.id === colorId)?.name ?? "";
  const sizeName = sizes.find((s) => s.id === sizeId)?.name ?? "";

  function add(goToCheckout: boolean) {
    if (!variant || !canBuy) return;
    cart.add({ variantId: variant.id, quantity: qty, purchaseMode: mode, label: `${productName} — ${colorName} / ${sizeName}` });
    setMsg({ tone: "ok", text: "تمت الإضافة إلى السلة" });
    if (goToCheckout) router.push("/cart");
  }

  async function wishlist() {
    if (!variant) return setMsg({ tone: "err", text: "اختر اللون والمقاس أولًا" });
    const r = await fetch("/api/v1/account/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantId: variant.id }) });
    if (r.status === 401) return router.push(`/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    setMsg(r.ok ? { tone: "ok", text: "أُضيف إلى المفضلة" } : { tone: "err", text: "تعذر الإضافة إلى المفضلة" });
  }

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">اللون: <span className="font-normal">{colorName}</span></legend>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name="color" className="peer sr-only" checked={colorId === c.id} onChange={() => { setColorId(c.id); setSizeId(null); setMsg(null); }} />
              <span className="flex min-h-11 items-center gap-2 rounded-md border border-input px-3 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary/30 peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
                <span className="inline-block size-5 rounded-full border border-border" style={{ background: c.swatchHex }} aria-hidden />
                {c.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">المقاس</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => {
            const v = sizeAvail(s.id);
            const disabled = !v;
            const soldOut = v && v.available === 0;
            return (
              <label key={s.id} className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
                <input type="radio" name="size" className="peer sr-only" disabled={disabled} checked={sizeId === s.id} onChange={() => { setSizeId(s.id); setMsg(null); }} />
                <span className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border border-input px-3 peer-checked:border-primary peer-checked:bg-accent peer-checked:ring-2 peer-checked:ring-primary/30 peer-focus-visible:outline-2 peer-focus-visible:outline-ring ${disabled || soldOut ? "text-muted-foreground line-through" : ""}`}>
                  {s.name}
                  {soldOut && <span className="sr-only"> (نفد)</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">طريقة الشراء</legend>
        <div className="inline-flex rounded-md border border-input p-1" role="radiogroup">
          {(["RETAIL", "BULK"] as const).map((m) => (
            <label key={m} className="cursor-pointer">
              <input type="radio" name="mode" className="peer sr-only" checked={mode === m} onChange={() => { setMode(m); if (m === "BULK" && preview?.moq) setQty(preview.moq); setMsg(null); }} />
              <span className="block min-h-10 rounded px-4 py-2 text-sm peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
                {m === "RETAIL" ? "تجزئة" : "جملة"}
              </span>
            </label>
          ))}
        </div>
        {mode === "BULK" && variant && (
          bulkTiers.length ? (
            <table className="mt-3 w-full max-w-sm text-sm">
              <caption className="mb-1 text-start font-semibold">أسعار الجملة لهذا الخيار</caption>
              <thead><tr className="text-muted-foreground"><th className="text-start font-normal">الكمية</th><th className="text-start font-normal">سعر القطعة</th></tr></thead>
              <tbody>
                {bulkTiers.map((t) => (
                  <tr key={t.id} className="border-t border-border"><td className="py-1">{t.minQty}{t.maxQty ? `–${t.maxQty}` : "+"}</td><td>{formatSAR(t.unitPriceHalalas)}</td></tr>
                ))}
              </tbody>
            </table>
          ) : <p className="mt-2 text-sm text-muted-foreground">الجملة غير متاحة لهذا اللون والمقاس.</p>
        )}
      </fieldset>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="qty" className="mb-1 block text-sm font-semibold">الكمية</label>
          <input id="qty" type="number" inputMode="numeric" min={1} max={100000} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))} className="min-h-11 w-28 rounded-md border border-input bg-card px-3" />
        </div>
        <div aria-live="polite" className="text-sm">
          {!variant ? (
            <p className="text-muted-foreground">اختر المقاس لعرض السعر والتوفر</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground" dir="ltr">SKU: {variant.sku}</p>
              {preview?.unit ? <p><span className="text-lg font-bold">{formatSAR(preview.unit)}</span> / قطعة · الإجمالي {formatSAR(preview.unit * qty)}</p> : <p className="text-destructive">{preview?.error}</p>}
              <p className={variant.available === 0 ? "text-destructive" : variant.available <= lowStockThreshold ? "text-warning" : "text-success"}>
                {variant.available === 0 ? "نفدت الكمية" : variant.available <= lowStockThreshold ? `متبقٍ ${variant.available} فقط` : "متوفر"}
              </p>
              {tooMany && variant.available > 0 && <p className="text-destructive">المتوفر حاليًا {variant.available} قطعة</p>}
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!canBuy} onClick={() => add(false)} className="min-h-12 flex-1 rounded-md bg-primary px-6 font-semibold text-white disabled:opacity-50">أضف إلى السلة</button>
        <button type="button" disabled={!canBuy} onClick={() => add(true)} className="min-h-12 flex-1 rounded-md border border-primary px-6 font-semibold text-primary disabled:opacity-50">اشترِ الآن</button>
        <button type="button" onClick={wishlist} className="flex size-12 items-center justify-center rounded-md border border-input" aria-label="أضف إلى المفضلة"><HeartIcon /></button>
      </div>
      {msg && <p role="status" className={msg.tone === "ok" ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}
      <p className="text-xs text-muted-foreground">الأسعار والتوفر نهائية عند إتمام الطلب. السلة لا تحجز المنتجات.</p>
    </div>
  );
}
