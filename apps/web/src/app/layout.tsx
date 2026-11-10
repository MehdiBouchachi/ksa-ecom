import type { Metadata, Viewport } from "next";
import { getSetting } from "@/server/lib/settings";
import { indexable, siteUrl } from "@/lib/site";
// IBM Plex Sans Arabic (OFL) vendored via npm: served from our own origin, no build-time or runtime
// request to Google (builds must not depend on fonts.gstatic.com being reachable). unicode-range per subset.
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
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
    description: "متجر إلكتروني سعودي — دفع آمن وتتبع للطلبات.",
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "website", locale: "ar_SA", siteName: name },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#17624f" };

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
