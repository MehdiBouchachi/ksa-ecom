"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type Point = { day: string; revenueHalalas: number; orders: number };

const H = 240;
const PAD = { top: 16, bottom: 28, side: 8, axis: 56 };

/**
 * Single-series daily revenue (area + 2px line). Hover / arrow keys move a crosshair with a tooltip.
 * RTL mirrors the time axis so time flows in the reading direction. A hidden table mirrors the data.
 */
export function RevenueChart({
  data,
  locale,
  s,
}: {
  data: Point[];
  locale: "ar" | "en";
  s: { ordersWord: string; tableCaption: string; day: string; revenue: string; empty: string };
}) {
  const rtl = locale === "ar";
  const nf = locale === "ar" ? "ar-SA-u-nu-latn" : "en-SA";
  const money = useMemo(() => new Intl.NumberFormat(nf, { style: "currency", currency: "SAR", maximumFractionDigits: 0 }), [nf]);
  const compact = useMemo(() => new Intl.NumberFormat(nf, { notation: "compact", maximumFractionDigits: 1 }), [nf]);
  const dayFmt = useMemo(() => new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), [locale]);
  const fmtDay = (d: string) => dayFmt.format(new Date(d + "T00:00:00Z"));

  const wrapRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = data.map((d) => d.revenueHalalas / 100);
  const rawMax = Math.max(0, ...values);
  const max = niceMax(rawMax);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const isEmpty = rawMax === 0;

  const plotL = rtl ? PAD.side : PAD.axis;
  const plotR = rtl ? w - PAD.axis : w - PAD.side;
  const plotW = Math.max(0, plotR - plotL);
  const plotH = H - PAD.top - PAD.bottom;
  const n = data.length;
  const xAt = (i: number) => {
    const f = n <= 1 ? 0.5 : i / (n - 1);
    return rtl ? plotR - f * plotW : plotL + f * plotW;
  };
  const yAt = (v: number) => PAD.top + plotH - (max ? (v / max) * plotH : 0);

  const line = monotonePath(values.map((v, i) => [xAt(i), yAt(v)] as [number, number]));
  const area = n ? `${line}L${xAt(n - 1).toFixed(1)},${yAt(0)}L${xAt(0).toFixed(1)},${yAt(0)}Z` : "";
  const labelIdx = n <= 1 ? [0] : n <= 7 ? data.map((_, i) => i) : [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1];

  function onMove(clientX: number) {
    const el = wrapRef.current;
    if (!el || !n) return;
    const x = clientX - el.getBoundingClientRect().left;
    const f = plotW ? (rtl ? plotR - x : x - plotL) / plotW : 0;
    setHover(Math.min(n - 1, Math.max(0, Math.round(f * (n - 1)))));
  }

  const h = hover !== null ? data[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(xAt(hover), 80), Math.max(80, w - 80)) : 0;

  return (
    <div>
      <div
        ref={wrapRef}
        className="relative h-[240px] w-full touch-pan-y select-none outline-none"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
        tabIndex={0}
        role="img"
        aria-label={s.tableCaption}
        onKeyDown={(e) => {
          if (!n) return;
          const fwd = rtl ? "ArrowLeft" : "ArrowRight";
          const back = rtl ? "ArrowRight" : "ArrowLeft";
          if (e.key === fwd) setHover((i) => Math.min(n - 1, (i ?? -1) + 1));
          else if (e.key === back) setHover((i) => Math.max(0, (i ?? n) - 1));
          else if (e.key === "Escape") setHover(null);
          else return;
          e.preventDefault();
        }}
        onBlur={() => setHover(null)}
      >
        {w > 0 && (
          <svg width={w} height={H} direction="ltr" className="block overflow-visible" aria-hidden>
            <defs>
              <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={plotL} x2={plotR} y1={yAt(t)} y2={yAt(t)} stroke="var(--color-border)" strokeDasharray={i ? "3 4" : undefined} />
                <text x={rtl ? plotR + 8 : plotL - 8} y={yAt(t)} dy="0.32em" textAnchor={rtl ? "start" : "end"} className="fill-muted-foreground text-[11px] tabular">
                  {compact.format(t)}
                </text>
              </g>
            ))}
            {labelIdx.map((i) => (
              <text key={i} x={xAt(i)} y={H - 6} textAnchor={i === 0 ? (rtl ? "end" : "start") : i === n - 1 ? (rtl ? "start" : "end") : "middle"} className="fill-muted-foreground text-[11px]">
                {fmtDay(data[i]!.day)}
              </text>
            ))}
            {!isEmpty && (
              <>
                <path d={area} fill={`url(#g${gid})`} className="fade-in" />
                <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="chart-line" />
              </>
            )}
            {hover !== null && h && (
              <g>
                <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD.top} y2={yAt(0)} stroke="var(--color-muted-foreground)" strokeOpacity={0.35} />
                <circle cx={xAt(hover)} cy={yAt(values[hover]!)} r={5} fill="var(--color-primary)" stroke="var(--color-card)" strokeWidth={2} />
              </g>
            )}
          </svg>
        )}
        {isEmpty && w > 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-muted-foreground">{s.empty}</p>
        )}
        {h && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg"
            style={{ left: tipLeft }}
            role="status"
          >
            <p className="text-muted-foreground">{fmtDay(h.day)}</p>
            <p className="tabular text-sm font-semibold">{money.format(h.revenueHalalas / 100)}</p>
            <p className="tabular text-muted-foreground">
              {h.orders} {s.ordersWord}
            </p>
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>{s.tableCaption}</caption>
        <thead>
          <tr>
            <th>{s.day}</th>
            <th>{s.revenue}</th>
            <th>{s.ordersWord}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{money.format(d.revenueHalalas / 100)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Monotone cubic (Fritsch–Carlson) path: smooth, never overshoots below zero or above peaks. */
function monotonePath(pts: [number, number][]) {
  const n = pts.length;
  if (!n) return "";
  if (n < 3) return pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1]![0] - pts[i]![0];
    m[i] = dx[i] ? (pts[i + 1]![1] - pts[i]![1]) / dx[i]! : 0;
  }
  t[0] = m[0]!;
  t[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (3 * (dx[i - 1]! + dx[i]!)) / ((2 * dx[i]! + dx[i - 1]!) / m[i - 1]! + (dx[i]! + 2 * dx[i - 1]!) / m[i]!);
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]!, [x1, y1] = pts[i + 1]!, h = dx[i]! / 3;
    d += `C${(x0 + h).toFixed(1)},${(y0 + h * t[i]!).toFixed(1)} ${(x1 - h).toFixed(1)},${(y1 - h * t[i + 1]!).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/** Rounds the axis max up to 1/2/2.5/5 × 10^k so gridlines land on readable values. */
function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = [1, 2, 2.5, 5, 10].find((k) => k * p >= v) ?? 10;
  return m * p;
}
