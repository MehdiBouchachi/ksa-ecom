import "server-only";
import { cookies } from "next/headers";

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_COOKIE = "locale";

export const isLocale = (v: unknown): v is Locale => v === "ar" || v === "en";
export const dirOf = (l: Locale) => (l === "ar" ? "rtl" : "ltr");

/** UI language preference (cookie). Arabic is the default. Never used for authorization. */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : "ar";
}
