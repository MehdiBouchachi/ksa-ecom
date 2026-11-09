import Link from "next/link";
import { getSetting } from "@/server/lib/settings";

const METHOD_LABEL = { MADA: "مدى", VISA: "Visa", MASTERCARD: "Mastercard", APPLE_PAY: "Apple Pay" } as const;

export async function Footer() {
  const store = await getSetting("store").catch(() => null);
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-bold">{store?.name ?? "المتجر"}</p>
          {/* Merchant identity details render only when the merchant has supplied them. */}
          {store?.commercialRegistration && <p className="mt-2 text-sm text-muted-foreground">السجل التجاري: {store.commercialRegistration}</p>}
          {store?.vatNumber && <p className="text-sm text-muted-foreground">الرقم الضريبي: {store.vatNumber}</p>}
          {store?.address && <p className="text-sm text-muted-foreground">{store.address}</p>}
          {store?.email && <p className="text-sm text-muted-foreground"><a href={`mailto:${store.email}`}>{store.email}</a></p>}
          {store?.phone && <p className="text-sm text-muted-foreground" dir="ltr">{store.phone}</p>}
        </div>
        <nav aria-label="السياسات">
          <p className="font-bold">السياسات</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link href="/policies/shipping">سياسة الشحن</Link></li>
            <li><Link href="/policies/returns">الاسترجاع والاستبدال</Link></li>
            <li><Link href="/policies/privacy">سياسة الخصوصية</Link></li>
            <li><Link href="/policies/terms">الشروط والأحكام</Link></li>
          </ul>
        </nav>
        <div>
          <p className="font-bold">المساعدة</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link href="/faq">الأسئلة الشائعة</Link></li>
            <li><Link href="/contact">تواصل معنا</Link></li>
            <li><Link href="/account/orders">تتبع طلبك</Link></li>
          </ul>
          {!!store?.enabledPaymentMethods.length && (
            <p className="mt-4 text-sm text-muted-foreground">طرق الدفع: {store.enabledPaymentMethods.map((m) => METHOD_LABEL[m]).join(" · ")}</p>
          )}
        </div>
      </div>
      <p className="border-t border-border py-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {store?.legalName ?? store?.name ?? ""}</p>
    </footer>
  );
}
