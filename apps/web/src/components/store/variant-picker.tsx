"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Minus, Plus } from "lucide-react";
import { formatSAR, type PurchaseMode } from "@saudi-ecom/contracts";
import { cart } from "@/components/cart/cart-store";
import { cn } from "@/lib/utils";
import type { ProductDetailVariant } from "@/server/catalog";
import { btnPrimary, btnSecondary, TextilePanel } from "./ui";

type Color = { id: string; slug: string; name: string; swatchHex: string };
type Size = { id: string; slug: string; name: string };
type Media = { id: string; kind: string; url: string; alt: string; colorId: string | null };

type Props = {
  productName: string;
  variants: ProductDetailVariant[];
  colors: Color[];
  sizes: Size[];
  media: Media[];
  initialColorId: string | null;
  initialMode: PurchaseMode;
  lowStockThreshold: number;
  /** Server-rendered title/description block, placed above the picker. */
  children: React.ReactNode;
  /** Server-rendered specs etc., placed below the picker. */
  details?: React.ReactNode;
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

export function ProductView({ productName, variants, colors, sizes, media, initialColorId, initialMode, lowStockThreshold, children, details }: Props) {
  const router = useRouter();
  const sizeGroup = useRef<HTMLFieldSetElement>(null);
  const [colorId, setColorId] = useState<string | null>(initialColorId ?? colors[0]?.id ?? null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [mode, setMode] = useState<PurchaseMode>(initialMode);
  // Deep-linked wholesale (?mode=bulk) starts at the real wholesale minimum for the chosen colour.
  const [qty, setQty] = useState(() => {
    if (initialMode !== "BULK") return 1;
    const c = initialColorId ?? colors[0]?.id;
    const mins = variants.filter((v) => v.colorId === c).flatMap((v) => v.tiers.filter((t) => t.mode === "BULK").map((t) => t.minQty));
    return mins.length ? Math.min(...mins) : 1;
  });
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [shown, setShown] = useState(0);

  const color = colors.find((c) => c.id === colorId) ?? null;
  const variant = useMemo(() => variants.find((v) => v.colorId === colorId && v.sizeId === sizeId) ?? null, [variants, colorId, sizeId]);
  const sizeAvail = (sid: string) => variants.find((v) => v.colorId === colorId && v.sizeId === sid);
  const bulkTiers = (variant ?? variants.find((v) => v.colorId === colorId))?.tiers.filter((t) => t.mode === "BULK") ?? [];
  const preview = variant ? previewUnit(variant, mode, qty) : null;
  const tooMany = !!variant && qty > variant.available;
  const canBuy = !!variant && variant.available > 0 && !!preview?.unit && !tooMany;
  const colorPrices = variants.filter((v) => v.colorId === colorId).map((v) => v.retailPriceHalalas);
  const fromPrice = colorPrices.length ? Math.min(...colorPrices) : null;

  // Images for the selected colour first, then images for all colours.
  const images = media.filter((m) => m.kind === "IMAGE" && (m.colorId === colorId || m.colorId === null)).sort((a, b) => Number(b.colorId === colorId) - Number(a.colorId === colorId));
  const main = images[Math.min(shown, images.length - 1)];

  function pickColor(id: string) {
    setColorId(id);
    setSizeId(null);
    setShown(0);
    setMsg(null);
    const slug = colors.find((c) => c.id === id)?.slug;
    if (slug) window.history.replaceState(null, "", `?color=${encodeURIComponent(slug)}`); // shareable, no navigation
  }
  function setMode2(m: PurchaseMode) {
    setMode(m);
    setMsg(null);
    if (m === "BULK" && variant) {
      const moq = previewUnit(variant, "BULK", qty).moq;
      if (moq && qty < moq) setQty(moq);
    }
    if (m === "BULK" && !variant && bulkTiers.length) setQty(Math.max(qty, Math.min(...bulkTiers.map((t) => t.minQty))));
  }
  function add(goToCart: boolean) {
    if (!variant) {
      setMsg({ tone: "err", text: "اختر المقاس أولًا" });
      sizeGroup.current?.querySelector<HTMLInputElement>("input:not(:disabled)")?.focus();
      sizeGroup.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    if (!canBuy) return;
    cart.add({ variantId: variant.id, quantity: qty, purchaseMode: mode, label: `${productName} — ${color?.name ?? ""} / ${sizes.find((s) => s.id === sizeId)?.name ?? ""}` });
    setMsg({ tone: "ok", text: "تمت الإضافة إلى السلة" });
    if (goToCart) router.push("/cart");
  }
  async function wishlist() {
    if (!variant) return setMsg({ tone: "err", text: "اختر اللون والمقاس أولًا" });
    const r = await fetch("/api/v1/account/wishlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantId: variant.id }) });
    if (r.status === 401) return router.push(`/auth/login?next=${encodeURIComponent(location.pathname + location.search)}`);
    setMsg(r.ok ? { tone: "ok", text: "أُضيف إلى المفضلة" } : { tone: "err", text: "تعذر الإضافة إلى المفضلة" });
  }

  const stockLine = !variant ? null : variant.available === 0 ? (
    <span className="text-destructive">نفدت الكمية</span>
  ) : variant.available <= lowStockThreshold ? (
    <span className="text-warning">متبقٍ {variant.available} فقط</span>
  ) : (
    <span className="inline-flex items-center gap-1 text-success"><Check className="size-4" aria-hidden /> متوفر</span>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
      {/* ------------------------------------------------------------ Gallery */}
      <section aria-label="صور المنتج" className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
          {main ? (
            <Image key={main.id} src={main.url} alt={main.alt} fill priority sizes="(min-width:1024px) 52vw, 100vw" className="object-cover" />
          ) : color ? (
            <TextilePanel hex={color.swatchHex} label={`${productName} — ${color.name}`} className="absolute inset-0" />
          ) : null}
          {color && !main && <span className="absolute bottom-4 start-4 rounded-md bg-card/95 px-3 py-1.5 text-sm font-semibold shadow-sm">{color.name}</span>}
        </div>
        {images.length > 1 && (
          <ul className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1" aria-label="الصور">
            {images.map((m, i) => (
              <li key={m.id} className="snap-start">
                <button type="button" onClick={() => setShown(i)} aria-label={`عرض الصورة ${i + 1}`} aria-pressed={i === shown} className={cn("relative block size-20 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-background", i === shown ? "ring-primary" : "ring-transparent")}>
                  <Image src={m.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------------------- Info */}
      <section aria-labelledby="pname" className="min-w-0">
        {children}

        <div className="mt-5 flex items-baseline gap-2 border-b border-border pb-6" aria-live="polite">
          {preview?.unit ? (
            <>
              <span className="text-[28px] font-bold leading-none">{formatSAR(preview.unit)}</span>
              <span className="text-sm text-muted-foreground">/ قطعة</span>
            </>
          ) : fromPrice !== null ? (
            <>
              <span className="text-sm text-muted-foreground">من</span>
              <span className="text-[28px] font-bold leading-none">{formatSAR(fromPrice)}</span>
            </>
          ) : null}
        </div>

        <div className="mt-6 space-y-7">
          <fieldset>
            <legend className="mb-3 text-sm font-semibold">اللون: <span className="font-normal text-muted-foreground">{color?.name}</span></legend>
            <div className="flex flex-wrap gap-2.5">
              {colors.map((c) => (
                <label key={c.id} className="cursor-pointer" title={c.name}>
                  <input type="radio" name="color" className="peer sr-only" checked={colorId === c.id} onChange={() => pickColor(c.id)} />
                  <span className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm transition-colors hover:border-foreground/30 peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                    <span className="inline-block size-5 rounded-full ring-1 ring-black/15" style={{ background: c.swatchHex }} aria-hidden />
                    {c.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset ref={sizeGroup}>
            <legend className="mb-3 text-sm font-semibold">المقاس {!sizeId && <span className="font-normal text-muted-foreground">— اختر مقاسًا</span>}</legend>
            <div className="flex flex-wrap gap-2.5">
              {sizes.map((s) => {
                const v = sizeAvail(s.id);
                const disabled = !v;
                const soldOut = v && v.available === 0;
                return (
                  <label key={s.id} className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
                    <input type="radio" name="size" className="peer sr-only" disabled={disabled} checked={sizeId === s.id} onChange={() => { setSizeId(s.id); setMsg(null); }} />
                    <span className={cn("flex min-h-12 min-w-12 items-center justify-center rounded-lg border border-border bg-card px-4 text-[15px] transition-colors hover:border-foreground/30 peer-checked:border-primary peer-checked:bg-primary peer-checked:font-semibold peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50", (disabled || soldOut) && "text-muted-foreground line-through opacity-60")}>
                      {s.name}
                      {soldOut && <span className="sr-only"> (نفد)</span>}
                      {disabled && <span className="sr-only"> (غير متوفر بهذا اللون)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold">طريقة الشراء</legend>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup">
              {(["RETAIL", "BULK"] as const).map((m) => (
                <label key={m} className="cursor-pointer">
                  <input type="radio" name="mode" className="peer sr-only" checked={mode === m} onChange={() => setMode2(m)} />
                  <span className="block min-h-11 rounded-lg px-4 py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors peer-checked:bg-card peer-checked:font-semibold peer-checked:text-foreground peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50">
                    {m === "RETAIL" ? "تجزئة" : "جملة"}
                  </span>
                </label>
              ))}
            </div>
            {mode === "BULK" &&
              (bulkTiers.length ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <caption className="bg-muted/60 px-4 py-2.5 text-start font-semibold">أسعار الجملة لهذا اللون والمقاس</caption>
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th scope="col" className="px-4 py-2 text-start font-normal">الكمية</th>
                        <th scope="col" className="px-4 py-2 text-start font-normal">سعر القطعة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkTiers.map((t) => {
                        const on = !!variant && qty >= t.minQty && (t.maxQty === null || qty <= t.maxQty);
                        return (
                          <tr key={t.id} className={cn("border-t border-border first:border-t-0", on && "bg-primary-soft font-semibold text-primary")}>
                            <td className="px-4 py-2.5" dir="ltr" style={{ textAlign: "start" }}>{t.minQty}{t.maxQty ? `–${t.maxQty}` : "+"}</td>
                            <td className="px-4 py-2.5">{formatSAR(t.unitPriceHalalas)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">يُحسب السعر لكل لون ومقاس على حدة حسب الكمية، ويُؤكَّد عند إتمام الطلب.</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">الشراء بالجملة غير متاح لهذا اللون.</p>
              ))}
          </fieldset>

          <div>
            <label htmlFor="qty" className="mb-3 block text-sm font-semibold">الكمية</label>
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center rounded-lg border border-border bg-card">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid size-12 place-items-center rounded-s-lg hover:bg-muted" aria-label="إنقاص الكمية"><Minus className="size-4" aria-hidden /></button>
                <input id="qty" type="number" inputMode="numeric" min={1} max={100000} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(100000, Number(e.target.value) || 1)))} className="h-12 w-20 border-x border-border bg-transparent text-center text-base font-semibold [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-ring/40 [&::-webkit-inner-spin-button]:appearance-none" />
                <button type="button" onClick={() => setQty((q) => Math.min(100000, q + 1))} className="grid size-12 place-items-center rounded-e-lg hover:bg-muted" aria-label="زيادة الكمية"><Plus className="size-4" aria-hidden /></button>
              </div>
              <div className="min-w-0 text-sm" aria-live="polite">
                {!variant ? (
                  <p className="text-muted-foreground">اختر المقاس لعرض السعر والتوفر</p>
                ) : (
                  <>
                    {preview?.unit ? (
                      <p>
                        الإجمالي <span className="text-base font-bold">{formatSAR(preview.unit * qty)}</span>
                      </p>
                    ) : (
                      <p className="text-destructive">{preview?.error}</p>
                    )}
                    <p className="mt-0.5">{stockLine}</p>
                    {tooMany && variant.available > 0 && <p className="text-destructive">المتوفر حاليًا {variant.available} قطعة</p>}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button type="button" disabled={!!variant && !canBuy} onClick={() => add(false)} className={cn(btnPrimary, "flex-1")}>
                {variant ? "أضف إلى السلة" : "اختر المقاس"}
              </button>
              <button type="button" onClick={wishlist} className={cn(btnSecondary, "px-0 w-12")} aria-label="أضف إلى المفضلة" title="أضف إلى المفضلة">
                <Heart className="size-5" aria-hidden />
              </button>
            </div>
            <button type="button" disabled={!!variant && !canBuy} onClick={() => add(true)} className={cn(btnSecondary, "w-full")}>اشترِ الآن</button>
            {msg && <p role="status" className={msg.tone === "ok" ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}
            {variant && <p className="text-xs text-muted-foreground" dir="ltr" style={{ textAlign: "start" }}>SKU: {variant.sku}</p>}
            <p className="text-xs leading-5 text-muted-foreground">الأسعار والتوفر نهائية عند إتمام الطلب. السلة لا تحجز المنتجات.</p>
          </div>
        </div>
        {details}
      </section>
    </div>
  );
}
