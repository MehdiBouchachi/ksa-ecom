import { AlertTriangle, Boxes, CircleSlash, History, SlidersHorizontal } from "lucide-react";
import { formatDate } from "@saudi-ecom/contracts";
import { btnCls, Field, Flash, inputCls, PageTitle, Section, Table } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listAdjustments, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { adjustStockAction } from "../actions";

const T = {
  ar: {
    title: "المخزون",
    desc: "مخزون واحد مشترك بين التجزئة والجملة لكل خيار (لون × مقاس).",
    total: "إجمالي الخيارات",
    low: "مخزون منخفض",
    out: "نفد",
    adjust: "تعديل المخزون",
    variant: "الخيار",
    delta: "التغيير",
    deltaHint: "رقم موجب للإضافة، سالب للخصم",
    reason: "السبب",
    reasonHint: "إلزامي — يظهر في سجل التدقيق",
    submit: "تسجيل التعديل",
    note: "لا يمكن خفض المخزون تحت الكمية المحجوزة لطلبات قيد الدفع. كل تعديل يُسجَّل باسمك في سجل غير قابل للتعديل.",
    cols: ["SKU", "اللون / المقاس", "في المستودع", "محجوز", "متاح"],
    ledger: "سجل الحركات",
    ledgerCols: ["التاريخ", "SKU", "التغيير", "النوع", "السبب", "بعد", "بواسطة"],
    system: "النظام",
    ok: "متوفر",
  },
  en: {
    title: "Inventory",
    desc: "One stock pool per variant (color × size), shared by retail and wholesale.",
    total: "Total variants",
    low: "Low stock",
    out: "Out of stock",
    adjust: "Adjust stock",
    variant: "Variant",
    delta: "Change",
    deltaHint: "Positive to add, negative to remove",
    reason: "Reason",
    reasonHint: "Required — recorded in the audit log",
    submit: "Record adjustment",
    note: "Stock cannot go below quantities reserved for orders awaiting payment. Every change is recorded under your name in an append-only log.",
    cols: ["SKU", "Color / size", "On hand", "Reserved", "Available"],
    ledger: "Movement log",
    ledgerCols: ["Date", "SKU", "Change", "Type", "Reason", "After", "By"],
    system: "System",
    ok: "In stock",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

export default async function Inventory({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const [variants, ledger, commerce] = await Promise.all([listVariantsAdmin(), listAdjustments(undefined, 50), getSetting("commerce")]);
  const threshold = commerce.lowStockThreshold;
  const rows = variants.map((v) => ({ ...v, avail: (v.onHand ?? 0) - (v.reserved ?? 0) }));
  const outN = rows.filter((r) => r.avail <= 0).length;
  const lowN = rows.filter((r) => r.avail > 0 && r.avail <= threshold).length;

  const stats = [
    { label: t.total, n: rows.length, icon: Boxes, tint: "bg-sky-50 text-sky-700 ring-sky-100" },
    { label: t.low, n: lowN, icon: AlertTriangle, tint: "bg-amber-50 text-amber-700 ring-amber-100" },
    { label: t.out, n: outN, icon: CircleSlash, tint: "bg-red-50 text-red-700 ring-red-100" },
  ];

  return (
    <>
      <PageTitle description={t.desc}>{t.title}</PageTitle>
      <Flash sp={await searchParams} />

      <div className="stagger mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s, i) => (
          <div key={s.label} style={{ "--i": i } as React.CSSProperties} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(16_24_40/0.04)]">
            <span className={cn("hidden size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset sm:grid", s.tint)} aria-hidden>
              <s.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs text-muted-foreground sm:text-sm">{s.label}</span>
              <span className="tabular block text-xl font-bold">{s.n}</span>
            </span>
          </div>
        ))}
      </div>

      <Section
        className="mb-6"
        title={
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" aria-hidden /> {t.adjust}
          </span>
        }
      >
        <form action={adjustStockAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_2fr_auto] lg:items-start">
          <Field label={t.variant}>
            <select name="variantId" required className={inputCls}>
              {rows.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku} — {v.colorName} / {v.sizeName} ({v.avail})
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.delta} hint={t.deltaHint}>
            <input name="delta" type="number" required dir="ltr" placeholder="+10 / -3" className={inputCls} />
          </Field>
          <Field label={t.reason} hint={t.reasonHint}>
            <input name="reason" required minLength={3} className={inputCls} />
          </Field>
          <div className="lg:pt-[1.625rem]">
            <button className={cn(btnCls, "w-full lg:w-auto")}>{t.submit}</button>
          </div>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">{t.note}</p>
      </Section>

      <Table head={[...t.cols.slice(0, 4), <span key="a" className="block text-end">{t.cols[4]}</span>]} empty={!rows.length}>
        {rows.map((v) => (
          <tr key={v.id}>
            <td className="font-mono text-xs" dir="ltr">{v.sku}</td>
            <td>{v.colorName} / {v.sizeName}</td>
            <td className="tabular">{v.onHand ?? 0}</td>
            <td className="tabular text-muted-foreground">{v.reserved ?? 0}</td>
            <td className="text-end">
              <span
                className={cn(
                  "tabular inline-flex min-w-12 items-center justify-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                  v.avail <= 0 ? "bg-red-50 text-red-700 ring-red-200" : v.avail <= threshold ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200",
                )}
                title={v.avail <= 0 ? t.out : v.avail <= threshold ? t.low : t.ok}
              >
                {v.avail}
                {v.avail <= 0 && <span className="sr-only"> — {t.out}</span>}
                {v.avail > 0 && v.avail <= threshold && <span className="sr-only"> — {t.low}</span>}
              </span>
            </td>
          </tr>
        ))}
      </Table>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold">
        <History className="size-5 text-primary" aria-hidden /> {t.ledger}
      </h2>
      <Table head={t.ledgerCols} empty={!ledger.length}>
        {ledger.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.createdAt, true, locale)}</td>
            <td className="font-mono text-xs" dir="ltr">{l.sku}</td>
            <td>
              <span dir="ltr" className={cn("tabular inline-block rounded-md px-2 py-0.5 text-xs font-semibold", l.delta < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
                {l.delta > 0 ? `+${l.delta}` : l.delta}
              </span>
            </td>
            <td className="text-xs">{l.kind}</td>
            <td className="max-w-64 truncate" title={l.reason ?? undefined}>{l.reason}</td>
            <td className="tabular">{l.onHandAfter}</td>
            <td className="text-muted-foreground">{l.actor ?? t.system}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
