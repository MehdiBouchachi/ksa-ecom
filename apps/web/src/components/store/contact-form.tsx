"use client";

import { useState } from "react";
import { contactSchema } from "@saudi-ecom/contracts";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";

type Errors = Partial<Record<"name" | "email" | "phone" | "subject" | "message", string>>;

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      const errs: Errors = {};
      for (const i of parsed.error.issues) errs[i.path[0] as keyof Errors] ??= i.message.length < 60 ? i.message : "قيمة غير صالحة";
      return setErrors(errs);
    }
    setErrors({});
    setState("sending");
    const r = await fetch("/api/v1/support/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    if (r.ok) {
      setState("sent");
      (e.target as HTMLFormElement).reset();
    } else {
      const j = await r.json().catch(() => null);
      setErrMsg(j?.error?.message ?? "تعذر الإرسال، حاول مرة أخرى");
      setState("error");
    }
  }

  const field = (name: keyof Errors, label: string, el: React.ReactNode) => (
    <div>
      <Label htmlFor={`c-${name}`}>{label}</Label>
      {el}
      <FieldError id={`c-${name}-err`}>{errors[name]}</FieldError>
    </div>
  );
  const a = (n: keyof Errors) => ({ id: `c-${n}`, name: n, "aria-invalid": !!errors[n] || undefined, "aria-describedby": errors[n] ? `c-${n}-err` : undefined });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-lg border border-border bg-card p-5">
      {field("name", "الاسم", <Input {...a("name")} autoComplete="name" required />)}
      {field("email", "البريد الإلكتروني", <Input {...a("email")} type="email" autoComplete="email" dir="ltr" required />)}
      {field("phone", "الجوال (اختياري)", <Input {...a("phone")} type="tel" autoComplete="tel" dir="ltr" placeholder="05XXXXXXXX" />)}
      {field("subject", "الموضوع", <Input {...a("subject")} required />)}
      {field("message", "الرسالة", <Textarea {...a("message")} required />)}
      <Button type="submit" disabled={state === "sending"}>{state === "sending" ? "جارٍ الإرسال…" : "أرسل الرسالة"}</Button>
      {state === "sent" && <Alert tone="success">تم استلام رسالتك، سنعاود التواصل قريبًا.</Alert>}
      {state === "error" && <Alert tone="danger">{errMsg}</Alert>}
    </form>
  );
}
