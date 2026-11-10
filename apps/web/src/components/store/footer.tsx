import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSetting } from "@/server/lib/settings";

const METHOD_LABEL = { MADA: "مدى", VISA: "Visa", MASTERCARD: "Mastercard", APPLE_PAY: "Apple Pay" } as const;

const COLUMNS = [
  { title: "التسوق", links: [{ href: "/products", label: "كل التشكيلات" }, { href: "/wishlist", label: "المفضلة" }, { href: "/cart", label: "السلة" }] },
  { title: "المساعدة", links: [{ href: "/faq", label: "الأسئلة الشائعة" }, { href: "/contact", label: "تواصل معنا" }, { href: "/account/orders", label: "تتبع طلبك" }, { href: "/about", label: "من نحن" }] },
  { title: "السياسات", links: [{ href: "/policies/shipping", label: "سياسة الشحن" }, { href: "/policies/returns", label: "الاسترجاع والاستبدال" }, { href: "/policies/privacy", label: "سياسة الخصوصية" }, { href: "/policies/terms", label: "الشروط والأحكام" }] },
];

/** Every merchant fact here comes from Admin → Settings; missing values are simply not shown. */
export async function Footer() {
  const store = await getSetting("store").catch(() => null);
  const name = store?.name || "المتجر";
  const contact = [
    store?.phone && { icon: Phone, text: store.phone, href: `tel:${store.phone.replace(/\s+/g, "")}`, ltr: true },
    store?.whatsapp && { icon: MessageCircle, text: store.whatsapp, href: `https://wa.me/${store.whatsapp.replace(/\D+/g, "")}`, ltr: true },
    store?.email && { icon: Mail, text: store.email, href: `mailto:${store.email}`, ltr: true },
    store?.address && { icon: MapPin, text: store.address, href: null, ltr: false },
  ].filter(Boolean) as { icon: typeof Phone; text: string; href: string | null; ltr: boolean }[];

  return (
    <footer className="mt-20 bg-muted/70 md:mt-28">
      <div className="container-store grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] md:py-16">
        <div className="col-span-2 md:col-span-1">
          <p className="text-xl font-bold text-primary">{name}</p>
          {contact.length > 0 && (
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {contact.map((c) => (
                <li key={c.text} className="flex items-start gap-2.5">
                  <c.icon className="mt-0.5 size-4 shrink-0 text-foreground/60" aria-hidden />
                  {c.href ? (
                    <a href={c.href} dir={c.ltr ? "ltr" : undefined} className="hover:text-foreground" {...(c.href.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {c.text}
                    </a>
                  ) : (
                    <span>{c.text}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-semibold">{col.title}</p>
            <ul className="mt-3 space-y-1">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-9 items-center text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-store flex flex-col gap-3 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {store?.legalName || name}
            {store?.commercialRegistration && <span> · السجل التجاري <span dir="ltr">{store.commercialRegistration}</span></span>}
            {store?.vatNumber && <span> · الرقم الضريبي <span dir="ltr">{store.vatNumber}</span></span>}
          </p>
          {!!store?.enabledPaymentMethods.length && (
            <ul className="flex flex-wrap items-center gap-1.5" aria-label="طرق الدفع المتاحة">
              {store.enabledPaymentMethods.map((m) => (
                <li key={m} className="rounded-md border border-border bg-card px-2 py-1 font-medium text-foreground/80">{METHOD_LABEL[m]}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}
