import { btnCls, Field, Flash, inputCls, PageTitle } from "@/components/admin/ui";
import { Alert } from "@/components/ui/card";
import { CONTENT_SLUGS, getContent } from "@/server/admin/catalog";
import { requireStaff } from "@/server/auth/guards";
import { getSettings } from "@/server/lib/settings";
import { saveCommerceSettingsAction, saveContentAction, saveStoreProfileAction } from "../actions";

export const metadata = { title: "الإعدادات" };

const CONTENT_TITLES: Record<(typeof CONTENT_SLUGS)[number], string> = { about: "من نحن", faq: "الأسئلة الشائعة", shipping: "سياسة الشحن", returns: "الاسترجاع والاستبدال", privacy: "سياسة الخصوصية", terms: "الشروط والأحكام" };

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; content?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const { commerce, store } = await getSettings();
  const slug = (CONTENT_SLUGS as readonly string[]).includes(sp.content ?? "") ? (sp.content as (typeof CONTENT_SLUGS)[number]) : "about";
  const content = await getContent(slug);
  const isAdmin = user.role === "ADMIN";
  return (
    <>
      <PageTitle>الإعدادات والمحتوى</PageTitle>
      <Flash sp={sp} />
      {!store.legalApproved && <Alert tone="warning" className="mb-4">لم يتم بعد اعتماد بيانات التاجر والسياسات والضريبة (ZATCA) والخصوصية (PDPL) من التاجر/المستشار القانوني. لا يجوز الإطلاق قبل ذلك.</Alert>}

      {isAdmin ? (
        <>
          <section className="mb-6 rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-bold">بيانات المتجر والتاجر (مدير عام)</h2>
            <form action={saveStoreProfileAction} className="grid gap-2 sm:grid-cols-3">
              <Field label="اسم المتجر"><input name="name" defaultValue={store.name} className={inputCls} /></Field>
              <Field label="الاسم بالإنجليزية"><input name="nameEn" defaultValue={store.nameEn} dir="ltr" className={inputCls} /></Field>
              <Field label="الاسم النظامي"><input name="legalName" defaultValue={store.legalName ?? ""} className={inputCls} /></Field>
              <Field label="السجل التجاري"><input name="commercialRegistration" defaultValue={store.commercialRegistration ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label="الرقم الضريبي (إن وجد)"><input name="vatNumber" defaultValue={store.vatNumber ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label="البريد"><input name="email" type="email" defaultValue={store.email ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label="الهاتف"><input name="phone" defaultValue={store.phone ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label="واتساب"><input name="whatsapp" defaultValue={store.whatsapp ?? ""} dir="ltr" className={inputCls} /></Field>
              <Field label="العنوان"><input name="address" defaultValue={store.address ?? ""} className={inputCls} /></Field>
              <fieldset className="text-sm sm:col-span-3">
                <legend className="mb-1 font-medium">طرق الدفع المفعّلة فعليًا لدى مزود الدفع</legend>
                {(["MADA", "VISA", "MASTERCARD", "APPLE_PAY"] as const).map((m) => (
                  <label key={m} className="me-4 inline-flex items-center gap-1"><input type="checkbox" name="enabledPaymentMethods" value={m} defaultChecked={store.enabledPaymentMethods.includes(m)} /> {m}</label>
                ))}
              </fieldset>
              <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="legalApproved" defaultChecked={store.legalApproved} /> تم اعتماد البيانات والمتطلبات القانونية والضريبية من التاجر/المستشار</label>
              <div><button className={btnCls}>حفظ</button></div>
            </form>
          </section>
          <section className="mb-6 rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 font-bold">الضريبة والحجز والشروط (مدير عام)</h2>
            <form action={saveCommerceSettingsAction} className="grid gap-2 sm:grid-cols-4">
              <Field label="نسبة الضريبة (نقطة أساس، 1500 = 15%)"><input name="vatRateBps" type="number" min={0} max={5000} defaultValue={commerce.vatRateBps} className={inputCls} /></Field>
              <Field label="مدة حجز المخزون (دقائق)"><input name="reservationMinutes" type="number" min={5} max={120} defaultValue={commerce.reservationMinutes} className={inputCls} /></Field>
              <Field label="نسخة الشروط"><input name="termsVersion" defaultValue={commerce.termsVersion} dir="ltr" className={inputCls} /></Field>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pricesIncludeVat" defaultChecked={commerce.pricesIncludeVat} /> الأسعار شاملة الضريبة</label>
              <div><button className={btnCls}>حفظ</button></div>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">تغيير نسخة الشروط يتطلب من العملاء الموافقة مجددًا عند الدفع.</p>
          </section>
        </>
      ) : (
        <Alert className="mb-6">إعدادات الضريبة وبيانات التاجر وطرق الدفع متاحة للمدير العام فقط. إعدادات الشحن في صفحة الشحن.</Alert>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 font-bold">صفحات المحتوى والسياسات</h2>
        <nav className="mb-3 flex flex-wrap gap-2 text-sm">
          {CONTENT_SLUGS.map((s) => <a key={s} href={`?content=${s}`} className={`rounded-md border px-3 py-1.5 ${s === slug ? "border-primary bg-accent" : "border-border"}`}>{CONTENT_TITLES[s]}</a>)}
        </nav>
        <form action={saveContentAction} className="space-y-2">
          <input type="hidden" name="slug" value={slug} />
          <Field label="العنوان"><input name="title" required defaultValue={content?.title ?? CONTENT_TITLES[slug]} className={inputCls} /></Field>
          <Field label="المحتوى (## عنوان، - نقطة، سطر فارغ = فقرة جديدة)"><textarea name="body" rows={14} required defaultValue={content?.body ?? ""} className={inputCls + " py-2"} /></Field>
          {isAdmin && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="approved" defaultChecked={content?.approved} /> معتمد من التاجر/المستشار القانوني</label>}
          <button className={btnCls}>حفظ</button>
        </form>
      </section>
    </>
  );
}
