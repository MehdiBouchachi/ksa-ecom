import Link from "next/link";
import { CheckCircle2, CircleDashed, CircleAlert } from "lucide-react";
import { formatSAR } from "@saudi-ecom/contracts";
import { SubmitButton } from "@/components/admin/overlay";
import { AdminPageHeader, btnCls, Callout, CheckRow, Field, Flash, FormSection, inputCls, Section, StatusBadge, TabNav, type Tone } from "@/components/admin/ui";
import { getLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { CONTENT_SLUGS, getContent, listContent, POLICY_SLUGS } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { integrationStatus, type IntegrationState } from "@/server/lib/integration-status";
import { getSettings } from "@/server/lib/settings";
import { saveCommerceSettingsAction, saveContentAction, saveStoreProfileAction } from "../actions";

type Slug = (typeof CONTENT_SLUGS)[number];
type Tab = "identity" | "content" | "payments" | "legal" | "integrations";

const T = {
  ar: {
    title: "الإعدادات والمحتوى",
    desc: "بيانات المتجر وصفحات المحتوى والضريبة والدفع وجاهزية الإطلاق.",
    tabsLabel: "أقسام الإعدادات",
    tabs: { identity: "بيانات النشاط", content: "محتوى المتجر", payments: "الدفع والضريبة", legal: "القانون والإطلاق", integrations: "حالة التكاملات" } as Record<Tab, string>,
    legalBanner: "لم يُعتمد بعد: بيانات التاجر والسياسات والضريبة (ZATCA) والخصوصية (PDPL). لا يجوز الإطلاق قبل ذلك.",
    review: "مراجعة الجاهزية",
    identityDesc: "تظهر في تذييل المتجر والفواتير والرسائل. يحددها التاجر — لا تُدخل بيانات تقديرية.",
    secStore: "اسم المتجر",
    storeName: "اسم المتجر بالعربية",
    nameEn: "اسم المتجر بالإنجليزية",
    secLegalId: "الهوية النظامية",
    legalName: "الاسم النظامي",
    cr: "السجل التجاري",
    vat: "الرقم الضريبي",
    ifAny: "إن وجد",
    secContact: "التواصل",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    whatsapp: "واتساب",
    address: "العنوان",
    save: "حفظ التغييرات",
    saving: "جارٍ الحفظ…",
    methods: "طرق الدفع المعروضة",
    methodsDesc: "حدد فقط الطرق المفعّلة فعليًا لدى مزود الدفع. تظهر كشعارات في المتجر.",
    tax: "الضريبة والحجز والشروط",
    vatRate: "نسبة الضريبة (نقطة أساس)",
    vatHint: "1500 = 15٪",
    inclusive: "الأسعار المعروضة شاملة الضريبة",
    reservation: "مدة حجز المخزون أثناء الدفع (دقائق)",
    reservationHint: "تُحرَّر الكميات المحجوزة تلقائيًا بعدها إذا لم يكتمل الدفع.",
    terms: "نسخة الشروط",
    termsNote: "تغيير نسخة الشروط يتطلب من العملاء الموافقة مجددًا عند الدفع.",
    shippingNote: "أسعار الشحن في صفحة الشحن ← الإعدادات.",
    toShipping: "إعدادات الشحن",
    content: "صفحات المحتوى والسياسات",
    pagesLabel: "الصفحات",
    pageTitle: "العنوان",
    body: "المحتوى",
    bodyHint: "## عنوان، - نقطة، سطر فارغ = فقرة جديدة",
    contentApproved: "معتمد من التاجر/المستشار القانوني",
    approvedBadge: "معتمد",
    draftBadge: "مسودة",
    slugs: { home: "الواجهة الرئيسية (عنوان ونص)", about: "من نحن", faq: "الأسئلة الشائعة", shipping: "سياسة الشحن", returns: "الاسترجاع والاستبدال", privacy: "سياسة الخصوصية", terms: "الشروط والأحكام" } as Record<Slug, string>,
    checks: "فحوصات الجاهزية",
    checksDesc: "فحوصات تلقائية من البيانات المحفوظة. لا تُغني عن مراجعة قانونية.",
    ck: {
      identity: "بيانات التاجر (الاسم النظامي، السجل التجاري، البريد، الهاتف)",
      policies: (a: number, n: number) => `السياسات المعتمدة: ${a} من ${n}`,
      payments: "طريقة دفع واحدة على الأقل محددة",
      shipping: "سعر الشحن محدد",
    },
    approval: "الاعتماد القانوني",
    approvalDesc: "يؤكد المدير العام أن التاجر/المستشار راجع بيانات النشاط والسياسات ومتطلبات ZATCA وPDPL.",
    approved: "تم اعتماد البيانات والمتطلبات القانونية والضريبية من التاجر/المستشار",
    ok: "مكتمل",
    todo: "ناقص",
    integrationsDesc: "حالة للقراءة فقط. بيانات الاعتماد تُضبط في متغيرات البيئة على الخادم ولا تظهر هنا أبدًا.",
    integ: { payment: "بوابة الدفع", shipping: "أرامكس", email: "البريد الصادر (SMTP)", database: "اتصال قاعدة البيانات (TLS)", media: "تخزين الوسائط الدائم" },
    states: { live: "مفعّل", sandbox: "وضع الاختبار", missing: "غير مضبوط" } as Record<IntegrationState, string>,
    managerNote: "بيانات النشاط والدفع والضريبة والتكاملات متاحة للمدير العام فقط. إعدادات الشحن في صفحة الشحن.",
  },
  en: {
    title: "Settings & content",
    desc: "Store identity, content pages, VAT and payments, and launch readiness.",
    tabsLabel: "Settings sections",
    tabs: { identity: "Business identity", content: "Storefront content", payments: "Payments & VAT", legal: "Legal & launch", integrations: "Integration status" } as Record<Tab, string>,
    legalBanner: "Not approved yet: merchant identity, policies, VAT (ZATCA) and privacy (PDPL). Do not launch before that.",
    review: "Review readiness",
    identityDesc: "Shown in the store footer, invoices and emails. Set by the merchant — never enter estimates.",
    secStore: "Store name",
    storeName: "Store name (Arabic)",
    nameEn: "Store name (English)",
    secLegalId: "Legal identity",
    legalName: "Legal name",
    cr: "Commercial registration",
    vat: "VAT number",
    ifAny: "If any",
    secContact: "Contact",
    email: "Email",
    phone: "Phone",
    whatsapp: "WhatsApp",
    address: "Address",
    save: "Save changes",
    saving: "Saving…",
    methods: "Payment methods shown",
    methodsDesc: "Select only the methods actually enabled at the payment provider. They appear as badges in the store.",
    tax: "VAT, reservation & terms",
    vatRate: "VAT rate (basis points)",
    vatHint: "1500 = 15%",
    inclusive: "Displayed prices include VAT",
    reservation: "Stock hold during payment (minutes)",
    reservationHint: "Held units are released automatically afterwards if payment does not complete.",
    terms: "Terms version",
    termsNote: "Changing the terms version requires customers to accept again at checkout.",
    shippingNote: "Shipping rates live under Shipping → Settings.",
    toShipping: "Shipping settings",
    content: "Content & policy pages",
    pagesLabel: "Pages",
    pageTitle: "Title",
    body: "Content",
    bodyHint: "## heading, - bullet, blank line = new paragraph",
    contentApproved: "Approved by the merchant / legal adviser",
    approvedBadge: "Approved",
    draftBadge: "Draft",
    slugs: { home: "Home page (headline & text)", about: "About", faq: "FAQ", shipping: "Shipping policy", returns: "Returns & exchanges", privacy: "Privacy policy", terms: "Terms & conditions" } as Record<Slug, string>,
    checks: "Readiness checks",
    checksDesc: "Automatic checks from saved data. They do not replace a legal review.",
    ck: {
      identity: "Merchant identity (legal name, commercial registration, email, phone)",
      policies: (a: number, n: number) => `Approved policies: ${a} of ${n}`,
      payments: "At least one payment method selected",
      shipping: "Shipping rate set",
    },
    approval: "Legal approval",
    approvalDesc: "The administrator confirms the merchant / adviser reviewed the business identity, policies, ZATCA and PDPL requirements.",
    approved: "Data and legal/tax requirements approved by the merchant / adviser",
    ok: "Done",
    todo: "Missing",
    integrationsDesc: "Read-only status. Credentials are set in server environment variables and are never shown here.",
    integ: { payment: "Payment gateway", shipping: "Aramex", email: "Outgoing email (SMTP)", database: "Database connection (TLS)", media: "Durable media storage" },
    states: { live: "Live", sandbox: "Sandbox", missing: "Not configured" } as Record<IntegrationState, string>,
    managerNote: "Business identity, payments, VAT and integrations are administrator-only. Shipping settings are on the Shipping page.",
  },
};

export async function generateMetadata() {
  return { title: T[await getLocale()].title };
}

const stateTone: Record<IntegrationState, Tone> = { live: "success", sandbox: "warning", missing: "neutral" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; tab?: string; content?: string }> }) {
  const user = await requireStaff();
  const locale = await getLocale();
  const t = T[locale];
  const sp = await searchParams;
  const isAdmin = user.role === "ADMIN";
  const allowed: Tab[] = isAdmin ? ["identity", "content", "payments", "legal", "integrations"] : ["content"];
  const tab: Tab = allowed.includes(sp.tab as Tab) ? (sp.tab as Tab) : sp.content ? "content" : allowed[0]!;
  const { commerce, store } = await getSettings();
  const href = (k: Tab, extra = "") => `/admin/settings?tab=${k}${extra}`;
  const back = (k: Tab) => <input type="hidden" name="back" value={href(k)} />;

  const header = (
    <>
      <AdminPageHeader title={t.title} description={t.desc} />
      <Flash sp={sp} />
      {isAdmin && !store.legalApproved && tab !== "legal" && (
        <Callout tone="warning" className="mb-4">
          {t.legalBanner} <Link href={href("legal")} className="font-medium underline">{t.review}</Link>
        </Callout>
      )}
      {!isAdmin && <Callout className="mb-4">{t.managerNote}</Callout>}
      {allowed.length > 1 && <TabNav label={t.tabsLabel} items={allowed.map((k) => ({ href: href(k), label: t.tabs[k], active: k === tab }))} />}
    </>
  );

  /* ------------------------------ Storefront content ------------------------------ */
  if (tab === "content") {
    const slug = (CONTENT_SLUGS as readonly string[]).includes(sp.content ?? "") ? (sp.content as Slug) : "about";
    const [content, all] = await Promise.all([getContent(slug), listContent()]);
    return (
      <>
        {header}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label={t.pagesLabel} className="h-fit rounded-lg border border-border bg-card p-1.5">
            <ul className="flex gap-1 overflow-x-auto lg:flex-col">
              {CONTENT_SLUGS.map((s) => {
                const row = all.find((c) => c.slug === s);
                return (
                  <li key={s} className="shrink-0">
                    <Link
                      href={href("content", `&content=${s}`)}
                      scroll={false}
                      aria-current={s === slug ? "page" : undefined}
                      className={cn("flex min-h-10 items-center justify-between gap-3 rounded-md px-3 text-sm", s === slug ? "bg-primary-soft font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
                    >
                      <span className="whitespace-nowrap">{t.slugs[s]}</span>
                      <span className={cn("size-2 shrink-0 rounded-full", row?.approved ? "bg-success" : "bg-warning")} title={row?.approved ? t.approvedBadge : t.draftBadge} aria-label={row?.approved ? t.approvedBadge : t.draftBadge} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <Section
            title={t.slugs[slug]}
            actions={<StatusBadge tone={content?.approved ? "success" : "warning"}>{content?.approved ? t.approvedBadge : t.draftBadge}</StatusBadge>}
          >
            <form action={saveContentAction} className="space-y-4" key={slug}>
              <input type="hidden" name="slug" value={slug} />
              <Field label={t.pageTitle} required><input name="title" dir="auto" required defaultValue={content?.title ?? T.ar.slugs[slug]} className={inputCls} /></Field>
              <Field label={t.body} required hint={t.bodyHint}><textarea name="body" dir="auto" rows={16} required defaultValue={content?.body ?? ""} className={cn(inputCls, "py-2 leading-relaxed")} /></Field>
              {isAdmin && <CheckRow name="approved" label={t.contentApproved} defaultChecked={content?.approved} />}
              <div className="flex justify-end border-t border-border pt-4">
                <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
              </div>
            </form>
          </Section>
        </div>
      </>
    );
  }

  /* ------------------------------ Business identity ------------------------------ */
  if (tab === "identity") {
    return (
      <>
        {header}
        <Section className="max-w-3xl">
          <p className="mb-5 text-sm text-muted-foreground">{t.identityDesc}</p>
          <form action={saveStoreProfileAction} className="space-y-6">
            {back("identity")}
            <FormSection title={t.secStore}>
              <Field label={t.storeName} required><input name="name" required dir="auto" defaultValue={store.name} className={inputCls} /></Field>
              <Field label={t.nameEn} required><input name="nameEn" required dir="ltr" defaultValue={store.nameEn} className={inputCls} /></Field>
            </FormSection>
            <FormSection title={t.secLegalId}>
              <Field label={t.legalName} className="sm:col-span-2"><input name="legalName" dir="auto" defaultValue={store.legalName ?? ""} className={inputCls} /></Field>
              <Field label={t.cr}><input name="commercialRegistration" dir="ltr" inputMode="numeric" defaultValue={store.commercialRegistration ?? ""} className={inputCls} /></Field>
              <Field label={t.vat} hint={t.ifAny}><input name="vatNumber" dir="ltr" inputMode="numeric" defaultValue={store.vatNumber ?? ""} className={inputCls} /></Field>
            </FormSection>
            <FormSection title={t.secContact}>
              <Field label={t.email}><input name="email" type="email" dir="ltr" defaultValue={store.email ?? ""} className={inputCls} /></Field>
              <Field label={t.phone}><input name="phone" type="tel" dir="ltr" defaultValue={store.phone ?? ""} className={inputCls} /></Field>
              <Field label={t.whatsapp}><input name="whatsapp" type="tel" dir="ltr" defaultValue={store.whatsapp ?? ""} className={inputCls} /></Field>
              <Field label={t.address}><input name="address" dir="auto" defaultValue={store.address ?? ""} className={inputCls} /></Field>
            </FormSection>
            <div className="flex justify-end border-t border-border pt-4">
              <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
            </div>
          </form>
        </Section>
      </>
    );
  }

  /* -------------------------------- Payments & VAT -------------------------------- */
  if (tab === "payments") {
    return (
      <>
        {header}
        <div className="max-w-3xl space-y-5">
          <Section title={t.methods}>
            <form action={saveStoreProfileAction} className="space-y-4">
              {back("payments")}
              <input type="hidden" name="_paymentMethods" value="1" />
              <p className="text-sm text-muted-foreground">{t.methodsDesc}</p>
              <fieldset>
                <legend className="sr-only">{t.methods}</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["MADA", "VISA", "MASTERCARD", "APPLE_PAY"] as const).map((m) => (
                    <CheckRow key={m} name="enabledPaymentMethods" value={m} label={m.replace("_", " ")} defaultChecked={store.enabledPaymentMethods.includes(m)} className="font-mono text-xs" />
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end border-t border-border pt-4">
                <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
              </div>
            </form>
          </Section>
          <Section title={t.tax}>
            <form action={saveCommerceSettingsAction} className="space-y-5">
              {back("payments")}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t.vatRate} required hint={t.vatHint}><input name="vatRateBps" type="number" required min={0} max={5000} dir="ltr" defaultValue={commerce.vatRateBps} className={inputCls} /></Field>
                <CheckRow name="pricesIncludeVat" label={t.inclusive} defaultChecked={commerce.pricesIncludeVat} className="sm:mt-6.5" />
                <Field label={t.reservation} required hint={t.reservationHint}><input name="reservationMinutes" type="number" required min={5} max={120} dir="ltr" defaultValue={commerce.reservationMinutes} className={inputCls} /></Field>
                <Field label={t.terms} required hint={t.termsNote}><input name="termsVersion" required dir="ltr" defaultValue={commerce.termsVersion} className={cn(inputCls, "font-mono")} /></Field>
              </div>
              <div className="flex justify-end border-t border-border pt-4">
                <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
              </div>
            </form>
          </Section>
          <Callout>
            {t.shippingNote} <Link href="/admin/shipping?tab=settings" className="font-medium underline">{t.toShipping}</Link>
          </Callout>
        </div>
      </>
    );
  }

  /* ------------------------------- Legal & launch -------------------------------- */
  if (tab === "legal") {
    const all = await listContent();
    const approvedN = POLICY_SLUGS.filter((s) => all.find((c) => c.slug === s)?.approved).length;
    const checks = [
      { label: t.ck.identity, ok: Boolean(store.legalName && store.commercialRegistration && store.email && store.phone), href: href("identity") },
      { label: t.ck.policies(approvedN, POLICY_SLUGS.length), ok: approvedN === POLICY_SLUGS.length, href: href("content") },
      { label: t.ck.payments, ok: store.enabledPaymentMethods.length > 0, href: href("payments") },
      { label: commerce.shippingFlatHalalas !== null ? `${t.ck.shipping}: ${formatSAR(commerce.shippingFlatHalalas, locale)}` : t.ck.shipping, ok: commerce.shippingFlatHalalas !== null, href: "/admin/shipping?tab=settings" },
    ];
    return (
      <>
        {header}
        <div className="max-w-3xl space-y-5">
          <Section title={t.checks}>
            <p className="mb-3 text-sm text-muted-foreground">{t.checksDesc}</p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {checks.map((c) => (
                <li key={c.label}>
                  <Link href={c.href} className="flex min-h-12 items-center gap-3 px-3 text-sm hover:bg-muted">
                    {c.ok ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : <CircleDashed className="size-5 shrink-0 text-warning" aria-hidden />}
                    <span className="min-w-0 flex-1">{c.label}</span>
                    <StatusBadge tone={c.ok ? "success" : "warning"}>{c.ok ? t.ok : t.todo}</StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          <Section title={t.approval}>
            <form action={saveStoreProfileAction} className="space-y-4">
              {back("legal")}
              <input type="hidden" name="_legal" value="1" />
              <p className="text-sm text-muted-foreground">{t.approvalDesc}</p>
              <CheckRow name="legalApproved" label={t.approved} defaultChecked={store.legalApproved} />
              <div className="flex justify-end border-t border-border pt-4">
                <SubmitButton className={btnCls} pendingLabel={t.saving}>{t.save}</SubmitButton>
              </div>
            </form>
          </Section>
        </div>
      </>
    );
  }

  /* ----------------------------- Integration status ------------------------------ */
  const st = integrationStatus();
  return (
    <>
      {header}
      <Section title={t.tabs.integrations} className="max-w-3xl">
        <p className="mb-3 text-sm text-muted-foreground">{t.integrationsDesc}</p>
        <ul className="divide-y divide-border rounded-md border border-border">
          {(Object.keys(t.integ) as (keyof typeof t.integ)[]).map((k) => (
            <li key={k} className="flex min-h-12 items-center gap-3 px-3 text-sm">
              {st[k] === "live" ? <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden /> : st[k] === "sandbox" ? <CircleAlert className="size-5 shrink-0 text-warning" aria-hidden /> : <CircleDashed className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
              <span className="min-w-0 flex-1">{t.integ[k]}</span>
              <StatusBadge tone={stateTone[st[k]]}>{t.states[st[k]]}</StatusBadge>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
