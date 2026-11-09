import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { adminDict } from "@/i18n/admin";
import { getLocale } from "@/i18n/locale";
import { btnOutlineCls } from "./ui";

/** Rendered for authenticated staff lacking the role (e.g. a Manager guessing /admin/team). No data is loaded. */
export async function Forbidden() {
  const t = adminDict(await getLocale()).forbidden;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-amber-50 text-amber-700" aria-hidden>
        <ShieldAlert className="size-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold">{t.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.body}</p>
      <Link href="/admin" className={`${btnOutlineCls} mt-6`}>{t.back}</Link>
    </div>
  );
}
