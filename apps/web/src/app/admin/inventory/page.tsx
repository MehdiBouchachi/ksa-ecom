import Link from "next/link";
import { History, SearchX, SlidersHorizontal } from "lucide-react";
import { formatDate } from "@saudi-ecom/contracts";
import { Overlay, OverlayFooter, SubmitButton } from "@/components/admin/overlay";
import { StockAdjustFields } from "@/components/admin/stock-adjust";
import { AdminPageHeader, btnCls, btnGhostCls, btnOutlineCls, Callout, EmptyState, Field, FilterBar, Flash, inputCls, StatStrip, StatusBadge, Swatch, Table, withParams } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { listAdjustments, listColors, listVariantsAdmin } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { getSetting } from "@/server/lib/settings";
import { adjustStockAction } from "../actions";

const T = {
  ar: {
    title: "المخزون",
    desc: "مخزون واحد لكل خيار (لون × مقاس) مشترك بين البيع بالتجزئة والجملة.",
    filters: "تصفية المخزون",
    search: "بحث",
    searchPh: "SKU أو لون أو مقاس",
    color: "اللون",
    allColors: "كل الألوان",
    level: "المستوى",
    anyLevel: "كل المستويات",
    apply: "تطبيق",
    clear: "مسح",
    statTotal: "الخيارات",
    statUnits: "قطع في المستودع",
    statReserved: "قطع محجوزة",
    low: "منخفض",
    out: "نفد",
    ok: "متوفر",
    cols: ["الخيار", "SKU", "في المستودع", "محجوز", "متاح", "الحالة", ""],
    adjust: "تعديل",
    adjustTitle: (l: string) => `تعديل مخزون ${l}`,
    adjustDesc: "كل تعديل يُسجَّل باسمك مع السبب في سجل غير قابل للتعديل.",
    reason: "السبب",
    reasonHint: "إلزامي، 3 أحرف على الأقل. مثال: استلام شحنة من المورد.",
    reasons: ["استلام شحنة من المورد", "جرد دوري", "تالف", "مرتجع من عميل", "تصحيح خطأ إدخال"],
    submit: "تسجيل التعديل",
    saving: "جارٍ التسجيل…",
    cancel: "إلغاء",
    close: "إغلاق",
    legend: "متاح = في المستودع − محجوز. المحجوز = كميات في طلبات تنتظر الدفع؛ تُحرَّر تلقائيًا إذا انتهت مهلة الدفع.",
    mode: "نوع التعديل",
    addM: "إضافة",
    removeM: "خصم",
    setM: "تحديد العدد",
    qty: "الكمية",
    qtyHint: { add: "عدد القطع المستلمة.", remove: "عدد القطع المخصومة (تالف، فقد…).", set: "العدد الفعلي بعد الجرد." },
    onHand: "في المستودع",
    reserved: "محجوز",
    available: "متاح",
    now: "الآن",
    after: "بعد التعديل",
    belowReserved: "لا يمكن النزول تحت الكمية المحجوزة ({n}).",
    noChange: "لا يوجد تغيير.",
    ledger: "سجل الحركات",
    ledgerDesc: "آخر 50 حركة. السجل للإضافة فقط ولا يمكن تعديله.",
    ledgerCols: ["التاريخ", "SKU", "التغيير", "النوع", "السبب", "بعدها", "بواسطة"],
    kinds: { RESTOCK: "إضافة", ADJUSTMENT: "تعديل", SALE: "بيع", CANCEL_RESTOCK: "إرجاع بعد إلغاء", RETURN_RESTOCK: "مرتجع" } as Record<string, string>,
    system: "النظام",
    noMatch: "لا توجد خيارات مطابقة",
    empty: "لا توجد خيارات بعد",
    emptyBody: "أنشئ الخيارات أولًا من صفحة الخيارات.",
    toVariants: "الذهاب إلى الخيارات",
    noLedger: "لا توجد حركات بعد.",
  },
  en: {
    title: "Stock",
    desc: "One stock pool per variant (color × size), shared by retail and wholesale.",
    filters: "Filter stock",
    search: "Search",
    searchPh: "SKU, color or size",
    color: "Color",
    allColors: "All colors",
    level: "Level",
    anyLevel: "Any level",
    apply: "Apply",
    clear: "Clear",
    statTotal: "Variants",
    statUnits: "Units on hand",
    statReserved: "Units reserved",
    low: "Low",
    out: "Out of stock",
    ok: "In stock",
    cols: ["Variant", "SKU", "On hand", "Reserved", "Available", "State", ""],
    adjust: "Adjust",
    adjustTitle: (l: string) => `Adjust stock — ${l}`,
    adjustDesc: "Every change is recorded under your name with its reason in an append-only log.",
    reason: "Reason",
    reasonHint: "Required, at least 3 characters. E.g. supplier delivery received.",
    reasons: ["Supplier delivery received", "Stock count", "Damaged", "Customer return", "Data entry correction"],
    submit: "Record adjustment",
    saving: "Recording…",
    cancel: "Cancel",
    close: "Close",
    legend: "Available = on hand − reserved. Reserved = units in orders awaiting payment; released automatically when payment times out.",
    mode: "Adjustment type",
    addM: "Add",
    removeM: "Remove",
    setM: "Set count",
    qty: "Quantity",
    qtyHint: { add: "Units received.", remove: "Units removed (damaged, lost…).", set: "Actual count after a stock take." },
    onHand: "On hand",
    reserved: "Reserved",
    available: "Available",
    now: "Now",
    after: "After",
    belowReserved: "Cannot go below the reserved quantity ({n}).",
    noChange: "No change.",
    ledger: "Movement log",
    ledgerDesc: "Latest 50 movements. The log is append-only.",
    ledgerCols: ["Date", "SKU", "Change", "Type", "Reason", "After", "By"],
    kinds: { RESTOCK: "Restock", ADJUSTMENT: "Adjustment", SALE: "Sale", CANCEL_RESTOCK: "Cancel restock", RETURN_RESTOCK: "Return" } as Record<string, string>,
    system: "System",
    noMatch: "No variants match these filters",
    empty: "No variants yet",
    emptyBody: "Create variants first on the Variants page.",
    toVariants: "Go to Variants",
    noLedger: "No movements yet.",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

type SP = { q?: string; color?: string; level?: string; ok?: string; error?: string };

export default async function Inventory({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const [variants, ledger, commerce, colors] = await Promise.all([listVariantsAdmin(), listAdjustments(undefined, 50), getSetting("commerce"), listColors()]);
  const threshold = commerce.lowStockThreshold;
  const rows = variants.map((v) => ({ ...v, colorName: (locale === "en" && v.colorNameEn) || v.colorName, onHand: v.onHand ?? 0, reserved: v.reserved ?? 0, avail: (v.onHand ?? 0) - (v.reserved ?? 0) }));
  const level = (a: number) => (a <= 0 ? "out" : a <= threshold ? "low" : "ok");
  const filters = { q: sp.q?.trim() || undefined, color: sp.color || undefined, level: sp.level || undefined };
  const q = filters.q?.toLowerCase();
  const filtered = rows
    .filter((v) => (!q || v.sku.toLowerCase().includes(q) || v.colorName.toLowerCase().includes(q) || v.sizeName.toLowerCase().includes(q)) && (!filters.color || v.colorId === filters.color) && (!filters.level || level(v.avail) === filters.level))
    // Problems first: out, then low, then the rest in catalogue order.
    .sort((a, b) => ["out", "low", "ok"].indexOf(level(a.avail)) - ["out", "low", "ok"].indexOf(level(b.avail)));
  const anyFilter = Object.values(filters).some(Boolean);
  const backHref = withParams("/admin/inventory", filters, {});
  const outN = rows.filter((r) => level(r.avail) === "out").length;
  const lowN = rows.filter((r) => level(r.avail) === "low").length;

  const badge = (a: number) => {
    const l = level(a);
    return <StatusBadge tone={l === "out" ? "danger" : l === "low" ? "warning" : "success"}>{l === "out" ? t.out : l === "low" ? t.low : t.ok}</StatusBadge>;
  };
  const adjust = (v: (typeof rows)[number]) => {
    const label = `${v.colorName} / ${v.sizeName}`;
    return (
      <Overlay
        trigger={<><SlidersHorizontal className="size-4" aria-hidden /> {t.adjust}</>}
        triggerClassName={cn(btnOutlineCls, "min-h-9 px-3")}
        triggerLabel={`${t.adjust} — ${v.sku}`}
        title={t.adjustTitle(label)}
        description={<span dir="ltr" className="font-mono text-xs">{v.sku}</span>}
        closeLabel={t.close}
      >
        <form action={adjustStockAction} className="space-y-5">
          <input type="hidden" name="variantId" value={v.id} />
          <input type="hidden" name="back" value={backHref} />
          <StockAdjustFields
            onHand={v.onHand}
            reserved={v.reserved}
            inputCls={inputCls}
            s={{ mode: t.mode, add: t.addM, remove: t.removeM, set: t.setM, qty: t.qty, qtyHint: t.qtyHint, onHand: t.onHand, reserved: t.reserved, available: t.available, now: t.now, after: t.after, belowReserved: t.belowReserved, noChange: t.noChange }}
          />
          <Field label={t.reason} required hint={t.reasonHint}>
            <input name="reason" required minLength={3} maxLength={300} list={`reasons-${v.id}`} autoComplete="off" className={inputCls} />
            <datalist id={`reasons-${v.id}`}>{t.reasons.map((r) => <option key={r} value={r} />)}</datalist>
          </Field>
          <p className="text-xs text-muted-foreground">{t.adjustDesc}</p>
          <OverlayFooter cancelLabel={t.cancel}>
            <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.submit}</SubmitButton>
          </OverlayFooter>
        </form>
      </Overlay>
    );
  };

  return (
    <>
      <AdminPageHeader title={t.title} description={t.desc} />
      <Flash sp={sp} />

      {rows.length === 0 ? (
        <EmptyState title={t.empty} action={<Link href="/admin/variants" className={btnOutlineCls}>{t.toVariants}</Link>}>{t.emptyBody}</EmptyState>
      ) : (
        <>
          <StatStrip
            items={[
              { label: t.statTotal, value: rows.length },
              { label: t.out, value: outN, tone: outN ? "danger" : undefined, href: "/admin/inventory?level=out" },
              { label: t.low, value: lowN, tone: lowN ? "warning" : undefined, href: "/admin/inventory?level=low" },
              { label: t.statUnits, value: rows.reduce((n, r) => n + r.onHand, 0) },
              { label: t.statReserved, value: rows.reduce((n, r) => n + r.reserved, 0) },
            ]}
          />
          <FilterBar label={t.filters}>
            <label className="min-w-0 flex-1 basis-56">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.search}</span>
              <input type="search" name="q" defaultValue={filters.q} placeholder={t.searchPh} className={inputCls} />
            </label>
            <label className="w-[calc(50%-4px)] sm:w-40">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.color}</span>
              <select name="color" defaultValue={filters.color ?? ""} className={inputCls}>
                <option value="">{t.allColors}</option>
                {colors.map((c) => <option key={c.id} value={c.id}>{(locale === "en" && c.nameEn) || c.name}</option>)}
              </select>
            </label>
            <label className="w-[calc(50%-4px)] sm:w-40">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t.level}</span>
              <select name="level" defaultValue={filters.level ?? ""} className={inputCls}>
                <option value="">{t.anyLevel}</option>
                <option value="out">{t.out}</option>
                <option value="low">{t.low}</option>
                <option value="ok">{t.ok}</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button className={btnOutlineCls}>{t.apply}</button>
              {anyFilter && <Link href="/admin/inventory" className={btnGhostCls}>{t.clear}</Link>}
            </div>
          </FilterBar>

          {filtered.length === 0 ? (
            <EmptyState icon={SearchX} title={t.noMatch} action={<Link href="/admin/inventory" className={btnOutlineCls}>{t.clear}</Link>} />
          ) : (
            <>
              <div className="hidden md:block">
                <Table head={[t.cols[0], t.cols[1], <span key="h" className="block text-end">{t.cols[2]}</span>, <span key="r" className="block text-end">{t.cols[3]}</span>, <span key="a" className="block text-end">{t.cols[4]}</span>, t.cols[5], ""]} caption={t.title}>
                  {filtered.map((v) => (
                    <tr key={v.id}>
                      <td><span className="inline-flex items-center gap-2 whitespace-nowrap"><Swatch hex={v.swatchHex} /> {v.colorName} / <span className="font-medium">{v.sizeName}</span></span></td>
                      <td className="font-mono text-xs" dir="ltr">{v.sku}</td>
                      <td className="tabular text-end">{v.onHand}</td>
                      <td className="tabular text-end text-muted-foreground">{v.reserved}</td>
                      <td className="tabular text-end font-semibold">{v.avail}</td>
                      <td>{badge(v.avail)}</td>
                      <td className="w-px text-end">{adjust(v)}</td>
                    </tr>
                  ))}
                </Table>
              </div>
              <ul className="space-y-2 md:hidden">
                {filtered.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-medium"><Swatch hex={v.swatchHex} /> {v.colorName} / {v.sizeName}</p>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground" dir="ltr">{v.sku}</p>
                      </div>
                      {badge(v.avail)}
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <div><dt className="text-xs text-muted-foreground">{t.onHand}</dt><dd className="tabular">{v.onHand}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">{t.reserved}</dt><dd className="tabular">{v.reserved}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">{t.available}</dt><dd className="tabular font-semibold">{v.avail}</dd></div>
                    </dl>
                    <div className="mt-2 flex justify-end">{adjust(v)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Callout className="mt-4">{t.legend}</Callout>
        </>
      )}

      <section className="mt-8" aria-labelledby="ledger-h">
        <h2 id="ledger-h" className="flex items-center gap-2 text-base font-semibold"><History className="size-4 text-muted-foreground" aria-hidden /> {t.ledger}</h2>
        <p className="mb-3 mt-0.5 text-sm text-muted-foreground">{t.ledgerDesc}</p>
        <Table head={t.ledgerCols} empty={!ledger.length} emptyText={t.noLedger} caption={t.ledger}>
          {ledger.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(l.createdAt, true, locale)}</td>
              <td className="font-mono text-xs" dir="ltr">{l.sku}</td>
              <td><span dir="ltr" className={cn("tabular font-semibold", l.delta < 0 ? "text-destructive" : "text-success")}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span></td>
              <td className="whitespace-nowrap text-xs">{t.kinds[l.kind] ?? l.kind}</td>
              <td className="max-w-64 truncate" title={l.reason ?? undefined}>{l.reason}</td>
              <td className="tabular">{l.onHandAfter}</td>
              <td className="text-muted-foreground">{l.actor ?? t.system}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}
