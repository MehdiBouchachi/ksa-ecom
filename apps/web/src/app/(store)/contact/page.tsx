import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { ContactForm } from "@/components/store/contact-form";
import { getSetting } from "@/server/lib/settings";

export const metadata: Metadata = { title: "تواصل معنا", description: "تواصل مع فريق خدمة العملاء.", alternates: { canonical: "/contact" } };

export default async function ContactPage() {
  const store = await getSetting("store");
  return (
    <>
      <Breadcrumbs items={[{ name: "تواصل معنا", href: "/contact" }]} />
      <h1 className="mt-2 text-2xl font-bold">تواصل معنا</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ContactForm />
        <aside className="space-y-2 rounded-lg border border-border bg-card p-5 text-sm">
          {store.email && <p>البريد: <a className="text-primary" href={`mailto:${store.email}`}>{store.email}</a></p>}
          {store.phone && <p>الهاتف: <span dir="ltr">{store.phone}</span></p>}
          {store.whatsapp && <p>واتساب: <span dir="ltr">{store.whatsapp}</span></p>}
          {store.address && <p>العنوان: {store.address}</p>}
          {!store.email && !store.phone && <p className="text-muted-foreground">بيانات التواصل بانتظار إضافتها من التاجر.</p>}
        </aside>
      </div>
    </>
  );
}
