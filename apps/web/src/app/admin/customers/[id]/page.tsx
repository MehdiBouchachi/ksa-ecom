import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail, Phone, ShieldOff, ShieldCheck } from "lucide-react";
import { formatDate, formatSAR } from "@saudi-ecom/contracts";
import { StatusBadges } from "@/components/account/status-badges";
import { btnDangerCls, btnOutlineCls, ConfirmBox, Flash, StatusPill, Table } from "@/components/admin/ui";
import { Forbidden } from "@/components/admin/forbidden";
import { getLocale } from "@/i18n/locale";
import { getCustomer } from "@/server/admin/people";
import { adminOrNull } from "@/server/auth/guards";
import { customerStatusAction } from "../../actions";

const T = {
  ar: {
    back: "العملاء",
    active: "نشط",
    disabled: "معطل",
    lastLogin: "آخر دخول",
    disableConfirm: "تعطيل الحساب وتسجيل خروجه",
    enableConfirm: "إعادة تفعيل الحساب",
    disable: "تعطيل الحساب",
    enable: "تفعيل الحساب",
    orders: "الطلبات",
    cols: ["الطلب", "الحالات", "الإجمالي", "التاريخ"],
    empty: "لا توجد طلبات لهذا العميل",
  },
  en: {
    back: "Customers",
    active: "Active",
    disabled: "Disabled",
    lastLogin: "Last login",
    disableConfirm: "Disable the account and sign it out",
    enableConfirm: "Re-enable the account",
    disable: "Disable account",
    enable: "Enable account",
    orders: "Orders",
    cols: ["Order", "Status", "Total", "Date"],
    empty: "This customer has no orders",
  },
};

export default async function Customer({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await adminOrNull();
  if (!user) return <Forbidden />;
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getCustomer(user, id);
  if (!c) notFound();
  const locale = await getLocale();
  const t = T[locale];
  const Back = locale === "ar" ? ArrowRight : ArrowLeft;
  const active = c.status === "ACTIVE";
  return (
    <>
      <Link href="/admin/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <Back className="size-4" aria-hidden /> {t.back}
      </Link>
      <Flash sp={await searchParams} />
      <section className="mb-6 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-xl font-bold text-primary" aria-hidden>{c.fullName.trim().slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
              {c.fullName} <StatusPill on={active} labels={[t.active, t.disabled]} />
            </h1>
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Mail className="size-4" aria-hidden /><span dir="ltr">{c.email}</span></span>
              <span className="inline-flex items-center gap-1.5"><Phone className="size-4" aria-hidden /><span dir="ltr">{c.phone ?? "—"}</span></span>
              <span>{t.lastLogin}: {c.lastLoginAt ? formatDate(c.lastLoginAt, true, locale) : "—"}</span>
            </p>
          </div>
        </div>
        <form action={customerStatusAction} className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="status" value={active ? "DISABLED" : "ACTIVE"} />
          <ConfirmBox label={active ? t.disableConfirm : t.enableConfirm} />
          <button className={active ? btnDangerCls : btnOutlineCls}>
            {active ? <ShieldOff className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
            {active ? t.disable : t.enable}
          </button>
        </form>
      </section>
      <h2 className="mb-3 text-lg font-semibold">{t.orders} <span className="tabular text-sm font-normal text-muted-foreground">({c.orders.length})</span></h2>
      <Table head={[t.cols[0], t.cols[1], <span key="t" className="block text-end">{t.cols[2]}</span>, t.cols[3]]} empty={!c.orders.length} emptyText={t.empty}>
        {c.orders.map((o) => (
          <tr key={o.id}>
            <td><Link href={`/admin/orders/${o.id}`} className="font-mono font-semibold text-primary hover:underline" dir="ltr">{o.reference}</Link></td>
            <td><StatusBadges order={o.orderStatus} payment={o.paymentStatus} locale={locale} compact /></td>
            <td className="tabular whitespace-nowrap text-end font-semibold">{formatSAR(o.totalHalalas, locale)}</td>
            <td className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(o.createdAt, false, locale)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
