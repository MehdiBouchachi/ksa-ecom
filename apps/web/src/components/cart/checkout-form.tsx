"use client";

import { useState } from "react";
import { checkoutPrepareSchema, formatSAR } from "@saudi-ecom/contracts";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Totals, useQuote } from "./cart-view";

const newKey = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

type Props = { defaults: { name: string; email: string; phone: string }; termsVersion: string };

export function CheckoutForm({ defaults, termsVersion }: Props) {
  const { lines, quote, error: quoteError } = useQuote();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // One idempotency key per checkout attempt; retried requests reuse it (no duplicate orders/holds).
  const [idemKey, setIdemKey] = useState(newKey);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const input = {
      items: lines.map(({ variantId, quantity, purchaseMode }) => ({ variantId, quantity, purchaseMode })),
      customer: { name: f.name, email: f.email, phone: f.phone },
      shippingAddress: { city: f.city, district: f.district, street: f.street, building: f.building, postalCode: f.postalCode },
      acceptedTermsVersion: f.terms === "on" ? termsVersion : "",
    };
    const parsed = checkoutPrepareSchema.safeParse(input);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) {
        const k = String(i.path[i.path.length - 1] === "acceptedTermsVersion" ? "terms" : i.path[i.path.length - 1]);
        errs[k] ??= k === "terms" ? "يجب الموافقة على الشروط" : i.message.length < 60 ? i.message : "قيمة غير صالحة";
      }
      setErrors(errs);
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    setServerError(null);
    try {
      const prep = await fetch("/api/v1/checkout/prepare", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": idemKey }, body: JSON.stringify(parsed.data) });
      const pj = await prep.json();
      if (!prep.ok) {
        if (pj.error?.code === "IDEMPOTENCY_KEY_REUSED") setIdemKey(newKey());
        throw new Error(pj.error?.message ?? "تعذر إنشاء الطلب");
      }
      const sess = await fetch("/api/v1/checkout/payment-session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderReference: pj.data.orderReference }) });
      const sj = await sess.json();
      if (!sess.ok) throw new Error(sj.error?.message ?? "تعذر بدء الدفع");
      window.location.assign(sj.data.redirectUrl);
    } catch (err) {
      setServerError((err as Error).message);
      setBusy(false);
    }
  }

  if (!lines.length) return <Alert>سلتك فارغة.</Alert>;
  const a = (n: string) => ({ id: `co-${n}`, name: n, "aria-invalid": !!errors[n] || undefined, "aria-describedby": errors[n] ? `co-${n}-err` : undefined });
  const fld = (n: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label htmlFor={`co-${n}`}>{label}</Label>
      <Input {...a(n)} {...props} />
      <FieldError id={`co-${n}-err`}>{errors[n]}</FieldError>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <fieldset className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
          <legend className="px-1 font-bold">بيانات التواصل</legend>
          {fld("name", "الاسم الكامل", { defaultValue: defaults.name, autoComplete: "name" })}
          {fld("phone", "رقم الجوال", { defaultValue: defaults.phone, autoComplete: "tel", type: "tel", dir: "ltr", placeholder: "05XXXXXXXX" })}
          <div className="sm:col-span-2">{fld("email", "البريد الإلكتروني", { defaultValue: defaults.email, autoComplete: "email", type: "email", dir: "ltr" })}</div>
        </fieldset>
        <fieldset className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
          <legend className="px-1 font-bold">عنوان الشحن (داخل المملكة)</legend>
          {fld("city", "المدينة", { autoComplete: "address-level2" })}
          {fld("district", "الحي", { autoComplete: "address-level3" })}
          {fld("street", "الشارع", { autoComplete: "address-line1" })}
          {fld("building", "رقم المبنى", { autoComplete: "address-line2" })}
          {fld("postalCode", "الرمز البريدي", { autoComplete: "postal-code", inputMode: "numeric", dir: "ltr" })}
        </fieldset>
        <div>
          <label className="flex min-h-11 items-start gap-2">
            <input type="checkbox" className="mt-1 size-4" {...a("terms")} />
            <span>أوافق على <a href="/policies/terms" target="_blank" className="text-primary underline">الشروط والأحكام</a> و<a href="/policies/returns" target="_blank" className="text-primary underline">سياسة الاسترجاع</a> و<a href="/policies/privacy" target="_blank" className="text-primary underline">سياسة الخصوصية</a>.</span>
          </label>
          <FieldError id="co-terms-err">{errors.terms}</FieldError>
        </div>
      </div>
      <aside className="h-fit space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="font-bold">ملخص الطلب</h2>
        <ul className="space-y-1 text-sm">
          {lines.map((l) => {
            const q = quote?.items.find((i) => i.variantId === l.variantId && i.purchaseMode === l.purchaseMode);
            return <li key={`${l.variantId}${l.purchaseMode}`} className="flex justify-between gap-2"><span>{l.label} × {l.quantity}</span><span>{q ? formatSAR(q.lineTotalHalalas) : ""}</span></li>;
          })}
        </ul>
        {quote && <Totals quote={quote} />}
        {quoteError && <Alert tone="danger">{quoteError.message}</Alert>}
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !quote}>{busy ? "جارٍ تحويلك للدفع…" : "المتابعة إلى الدفع"}</Button>
        <p className="text-xs text-muted-foreground">يُعاد حساب الأسعار والضريبة والشحن في الخادم ويتم حجز الكمية لمدة محدودة. الدفع يتم عبر صفحة مزود الدفع الآمنة.</p>
      </aside>
    </form>
  );
}
