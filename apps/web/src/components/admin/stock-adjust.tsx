"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type Strings = {
  mode: string;
  add: string;
  remove: string;
  set: string;
  qty: string;
  qtyHint: { add: string; remove: string; set: string };
  onHand: string;
  reserved: string;
  available: string;
  now: string;
  after: string;
  /** "{n}" is replaced by the reserved quantity (plain string: crosses the server→client boundary). */
  belowReserved: string;
  noChange: string;
};

/**
 * Turns "add / remove / set exact count" into the signed `delta` the server expects and previews
 * the result. The server re-checks everything under a row lock; this only prevents obvious mistakes.
 */
export function StockAdjustFields({ onHand, reserved, s, inputCls }: { onHand: number; reserved: number; s: Strings; inputCls: string }) {
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [raw, setRaw] = useState("");
  const id = useId();
  const n = raw === "" ? NaN : Math.trunc(Number(raw));
  const valid = Number.isFinite(n) && n >= 0;
  const delta = !valid ? 0 : mode === "add" ? n : mode === "remove" ? -n : n - onHand;
  const nextOnHand = onHand + delta;
  const tooLow = valid && nextOnHand < reserved;
  const msg = tooLow ? s.belowReserved.replace("{n}", String(reserved)) : valid && delta === 0 ? s.noChange : "";

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{s.mode}</legend>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-surface-muted p-1">
          {(["add", "remove", "set"] as const).map((m) => (
            <label key={m} className={cn("flex min-h-9 cursor-pointer items-center justify-center rounded px-2 text-sm font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring/40", mode === m ? "bg-card shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>
              <input type="radio" name={`${id}-mode`} value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {s[m]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium">
          {s.qty}
          <span className="ms-0.5 text-destructive" aria-hidden>*</span>
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          required
          dir="ltr"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          aria-describedby={`${id}-hint ${id}-msg`}
          aria-invalid={Boolean(msg) || undefined}
          className={cn(inputCls, msg && "border-destructive")}
        />
        <span id={`${id}-hint`} className="mt-1 block text-xs text-muted-foreground">{s.qtyHint[mode]}</span>
      </label>
      <input type="hidden" name="delta" value={valid ? delta : ""} />

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="py-1 text-start font-medium"><span className="sr-only">—</span></th>
            <th scope="col" className="py-1 text-end font-medium">{s.now}</th>
            <th scope="col" className="py-1 text-end font-medium">{s.after}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-y border-border">
          <tr>
            <th scope="row" className="py-2 text-start font-normal">{s.onHand}</th>
            <td className="tabular py-2 text-end">{onHand}</td>
            <td className={cn("tabular py-2 text-end font-semibold", tooLow && "text-destructive")}>{valid ? nextOnHand : "—"}</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 text-start font-normal">{s.reserved}</th>
            <td className="tabular py-2 text-end text-muted-foreground">{reserved}</td>
            <td className="tabular py-2 text-end text-muted-foreground">{reserved}</td>
          </tr>
          <tr>
            <th scope="row" className="py-2 text-start font-normal">{s.available}</th>
            <td className="tabular py-2 text-end">{onHand - reserved}</td>
            <td className={cn("tabular py-2 text-end font-semibold", tooLow && "text-destructive")}>{valid ? nextOnHand - reserved : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p id={`${id}-msg`} role="status" className={cn("min-h-5 text-sm", tooLow ? "text-destructive" : "text-muted-foreground")}>{msg}</p>
    </div>
  );
}
