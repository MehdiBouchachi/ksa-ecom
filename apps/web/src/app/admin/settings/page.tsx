import Link from "next/link";
import { AlertTriangle, FileText, Info, Percent, Store } from "lucide-react";
import { btnCls, CheckRow, Field, Flash, inputCls, PageTitle, Section } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { CONTENT_SLUGS, getContent } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { getSettings } from "@/server/lib/settings";
import { saveCommerceSettingsAction, saveContentAction, saveStoreProfileAction } from "../actions";

type Slug = (typeof CONTENT_SLUGS)[number];
const T = {
  ar: {
    title: "الإعدادات والمحتوى",
    legal: "لم يتم بعد اعتماد بيانات التاجر والسياسات والضريبة (ZATCA) والخصوصية (PDPL) من التاجر/المستشار القانوني. لا يجوز الإطلاق قبل ذلك.",
    profile: "بيانات المتجر والتاجر",
    adminOnly: "مدير عام",
    storeName: "اسم المتجر",
    nameEn: "الاسم بالإنجليزية",
    legalName: "الاسم النظامي",
    cr: "السجل التجاري",
    vat: "الرقم الضريبي",
    ifAny: "إن وجد",
    email: "البريد",
    phone: "الهاتف",
    whatsapp: "واتساب",
    address: "العنوان",
    methods: "طرق الدفع المفعّلة فعليًا لدى مزود الدفع",
    approved: "تم اعتماد البيانات والمتطلبات القانونية والضريبية من التاجر/المستشار",
    save: "حفظ",
    tax: "الضريبة والحجز والشروط",
    vatRate: "نسبة الضريبة (نقطة أساس)",
    vatHint: "1500 = 15%",
    reservation: "مدة حجز المخزون (دقائق)",
    terms: "نسخة الشروط",
    inclusive: "الأسعار شاملة الضريبة",
    termsNote: "تغيير نسخة الشروط يتطلب من العملاء الموافقة مجددًا عند الدفع.",
    managerNote: "إعدادات الضريبة وبيانات التاجر وطرق الدفع متاحة للمدير العام فقط. إعدادات الشحن في صفحة الشحن.",
    content: "صفحات المحتوى والسياسات",
    pageTitle: "العنوان",
    body: "المحتوى",
    bodyHint: "## عنوان، - نقطة، سطر فارغ = فقرة جديدة",
    contentApproved: "معتمد من التاجر/المستشار القانوني",
    slugs: { about: "من نحن", faq: "الأسئلة الشائعة", shipping: "سياسة الشحن", returns: "الاسترجاع والاستبدال", privacy: "سياسة الخصوصية", terms: "الشروط والأحكام" } as Record<Slug, string>,
  },
  en: {
    title: "Settings & content",
    legal: "Merchant identity, policies, VAT (ZATCA) and privacy (PDPL) have not been approved by the merchant / legal adviser yet. Do not launch before that.",
    profile: "Store & merchant profile",
    adminOnly: "Administrator",
    storeName: "Store name (Arabic)",
    nameEn: "Store name (English)",
    legalName: "Legal name",
    cr: "Commercial registration",
    vat: "VAT number",
    ifAny: "If any",
    email: "Email",
    phone: "Phone",
    whatsapp: "WhatsApp",
    address: "Address",
    methods: "Payment methods actually enabled at the payment provider",
    approved: "Data and legal/tax requirements approved by the merchant / adviser",
    save: "Save",
    tax: "VAT, reservation & terms",
    vatRate: "VAT rate (basis points)",
    vatHint: "1500 = 15%",
    reservation: "Stock reservation (minutes)",
    terms: "Terms version",
    inclusive: "Prices include VAT",
    termsNote: "Changing the terms version requires customers to accept again at checkout.",
    managerNote: "VAT, merchant identity and payment methods are administrator-only. Shipping settings are on the Shipping page.",
    content: "Content & policy pages",
    pageTitle: "Title",
    body: "Content",
    bodyHint: "## heading, - bullet, blank line = new paragraph",
    contentApproved: "Approved by the merchant / legal adviser",
    slugs: { about: "About", faq: "FAQ", shipping: "Shipping policy", returns: "Returns & exchanges", privacy: "Privacy policy", terms: "Terms & conditions" } as Record<Slug, string>,
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

const Head = ({ icon: Icon, text, badge }: { icon: typeof Store; text: string; badge?: string }) => (
  <span className="flex items-center gap-2">
    <Icon className="size-4 text-primary" aria-hidden /> {text}
    {badge && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{badge}</span>}
  </span>
);

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; content?: string }> }) {
  const user = await requireStaff();
  const t = T[await getLocale()];
  const sp = await searchParams;
  const { commerce, store } = await getSettings();
  const slug = (CONTENT_SLUGS as readonly string[]).includes(sp.content ?? "") ? (sp.content as Slug) : "about";
  const content = await getContent(slug);
  const isAdmin = user.role === "ADMIN";
  return (
    <>
      <PageTitle>{t.title}</PageTitle>
      <Flash sp={sp} />
      {!store.legalApproved && (
        <div role="status" className="mb-5 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{t.legal}</p>
        </div>
      )}

      {isAdmin ? (
        <>
          <Section className="mb-6" title={<Head icon={Store} text={t.profile} badge={t.adminOnly} />}>
            <form action={saveStoreProfileAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t.storeName}><input name="name" dir="auto" defaultValue={store.name} className={inputCls} /></Field>
              <Field label={t.nameEn}><input name="nameEn" defaultValue={store.nameEn} dir="ltr" className={inputCls} /></Field>
              <Field label={t.legalName}><input name="legalName" dir="auto" defaultValue={store.legalName ?? ""} className={inputCls} /></Field>
              <Field label={t.cr}><input name="commercialRegistration" defaultValue={store.commercialRegistration ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label={t.vat} hint={t.ifAny}><input name="vatNumber" defaultValue={store.vatNumber ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label={t.email}><input name="email" type="email" defaultValue={store.email ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label={t.phone}><input name="phone" defaultValue={store.phone ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label={t.whatsapp}><input name="whatsapp" defaultValue={store.whatsapp ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label={t.address}><input name="address" dir="auto" defaultValue={store.address ?? ""} className={inputCls} /></Field>
              <fieldset className="text-sm sm:col-span-2 lg:col-span-3">
                <legend className="mb-1.5 font-medium">{t.methods}</legend>
                <div className="flex flex-wrap gap-2">
                  {(["MADA", "VISA", "MASTERCARD", "APPLE_PAY"] as const).map((m) => (
                    <label key={m} className="cursor-pointer">
                      <input type="checkbox" name="enabledPaymentMethods" value={m} defaultChecked={store.enabledPaymentMethods.includes(m)} className="peer sr-only" />
                      <span className="inline-flex items-center rounded-full border border-border px-3 py-1 font-mono text-xs transition-colors peer-checked:border-primary peer-checked:bg-accent peer-checked:font-semibold peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30 hover:bg-muted">
                        {m.replace("_", " ")}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <CheckRow name="legalApproved" label={t.approved} defaultChecked={store.legalApproved} className="sm:col-span-2 lg:col-span-3" />
              <div className="border-t border-border pt-4 sm:col-span-2 lg:col-span-3"><button className={btnCls}>{t.save}</button></div>
            </form>
          </Section>

          <Section className="mb-6" title={<Head icon={Percent} text={t.tax} badge={t.adminOnly} />}>
            <form action={saveCommerceSettingsAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t.vatRate} hint={t.vatHint}><input name="vatRateBps" type="number" min={0} max={5000} defaultValue={commerce.vatRateBps} className={inputCls} /></Field>
              <Field label={t.reservation}><input name="reservationMinutes" type="number" min={5} max={120} defaultValue={commerce.reservationMinutes} className={inputCls} /></Field>
              <Field label={t.terms}><input name="termsVersion" defaultValue={commerce.termsVersion} dir="ltr" className={inputCls} /></Field>
              <div className="sm:pt-[1.625rem]"><CheckRow name="pricesIncludeVat" label={t.inclusive} defaultChecked={commerce.pricesIncludeVat} /></div>
              <div className="border-t border-border pt-4 sm:col-span-2 lg:col-span-4"><button className={btnCls}>{t.save}</button></div>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">{t.termsNote}</p>
          </Section>
        </>
      ) : (
        <div role="status" className="mb-6 flex gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm text-sky-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{t.managerNote}</p>
        </div>
      )}

      <Section title={<Head icon={FileText} text={t.content} />}>
        <nav className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {CONTENT_SLUGS.map((s) => (
            <Link
              key={s}
              href={`?content=${s}`}
              scroll={false}
              aria-current={s === slug ? "page" : undefined}
              className={cn("whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors", s === slug ? "border-primary bg-primary font-medium text-white" : "border-border hover:bg-muted")}
            >
              {t.slugs[s]}
            </Link>
          ))}
        </nav>
        <form action={saveContentAction} className="space-y-4" key={slug}>
          <input type="hidden" name="slug" value={slug} />
          <Field label={t.pageTitle}><input name="title" dir="auto" required defaultValue={content?.title ?? T.ar.slugs[slug]} className={inputCls} /></Field>
          <Field label={t.body} hint={t.bodyHint}><textarea name="body" dir="auto" rows={14} required defaultValue={content?.body ?? ""} className={cn(inputCls, "py-2 leading-relaxed")} /></Field>
          {isAdmin && <CheckRow name="approved" label={t.contentApproved} defaultChecked={content?.approved} />}
          <button className={btnCls}>{t.save}</button>
        </form>
      </Section>
    </>
  );
}
