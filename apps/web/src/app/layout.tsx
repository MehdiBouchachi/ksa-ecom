import type { Metadata, Viewport } from "next";
import { getSetting } from "@/server/lib/settings";
import { indexable, siteUrl } from "@/lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  let name = "المتجر";
  try {
    name = (await getSetting("store")).name;
  } catch {
    /* DB unavailable at build time: fall back to generic name */
  }
  return {
    metadataBase: new URL(siteUrl),
    title: { default: name, template: `%s | ${name}` },
    description: "متجر إلكتروني سعودي — شحن داخل المملكة ودفع آمن.",
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "website", locale: "ar_SA", siteName: name },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#115e59" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-dvh antialiased">
        <a href="#main" className="skip-link">
          تخطَّ إلى المحتوى
        </a>
        {children}
      </body>
    </html>
  );
}
