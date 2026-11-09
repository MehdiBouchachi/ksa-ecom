"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/auth/actions";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";

type Field = { name: string; label: string; type?: string; autoComplete?: string; dir?: "ltr" | "rtl"; hint?: string };

export function AuthForm(props: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
  hidden?: Record<string, string>;
  okMessage?: string;
  checkbox?: { name: string; label: React.ReactNode };
  footer?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(props.action, undefined);
  if (state?.ok && props.okMessage) return <Alert tone="success">{props.okMessage}</Alert>;
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      {Object.entries(props.hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {props.fields.map((f) => (
        <div key={f.name}>
          <Label htmlFor={`a-${f.name}`}>{f.label}</Label>
          <Input id={`a-${f.name}`} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} dir={f.dir} aria-invalid={!!fe[f.name] || undefined} aria-describedby={fe[f.name] ? `a-${f.name}-err` : f.hint ? `a-${f.name}-hint` : undefined} />
          {f.hint && !fe[f.name] && <p id={`a-${f.name}-hint`} className="mt-1 text-xs text-muted-foreground">{f.hint}</p>}
          <FieldError id={`a-${f.name}-err`}>{fe[f.name]}</FieldError>
        </div>
      ))}
      {props.checkbox && (
        <div>
          <label className="flex min-h-11 items-start gap-2 text-sm">
            <input type="checkbox" name={props.checkbox.name} className="mt-1 size-4" aria-invalid={!!fe[props.checkbox.name] || undefined} />
            <span>{props.checkbox.label}</span>
          </label>
          <FieldError>{fe[props.checkbox.name]}</FieldError>
        </div>
      )}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "يرجى الانتظار…" : props.submit}</Button>
      {props.footer}
    </form>
  );
}

export { Link };
