import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...p }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-card", className)} {...p} />;
}
export function Badge({ className, tone = "neutral", ...p }: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const tones = {
    neutral: "bg-muted text-foreground",
    success: "bg-green-50 text-green-800 border-green-200",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    info: "bg-teal-50 text-teal-900 border-teal-200",
  };
  return <span className={cn("inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...p} />;
}
export function Alert({ tone = "info", className, ...p }: HTMLAttributes<HTMLDivElement> & { tone?: "info" | "danger" | "warning" | "success" }) {
  const tones = { info: "bg-teal-50 border-teal-200", danger: "bg-red-50 border-red-200 text-red-900", warning: "bg-amber-50 border-amber-200 text-amber-900", success: "bg-green-50 border-green-200 text-green-900" };
  return <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-md border p-3 text-sm", tones[tone], className)} {...p} />;
}
