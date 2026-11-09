"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

/** Server-side FORBIDDEN/UNAUTHENTICATED errors from guards land here (no data is rendered). */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Hydration-safe read of the admin language (server snapshot = Arabic default).
  const en = useSyncExternalStore(() => () => {}, () => document.documentElement.lang === "en", () => false);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-red-50 text-red-700" aria-hidden>
        <AlertOctagon className="size-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold">{en ? "Something went wrong" : "غير مصرح أو حدث خطأ"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {en ? "You may not have access to this page, or an unexpected error occurred." : "ليست لديك صلاحية لهذه الصفحة، أو حدث خطأ غير متوقع."}
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground" dir="ltr">ref: {error.digest}</p>}
      <div className="mt-6 flex gap-2">
        <button onClick={reset} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
          <RotateCcw className="size-4" aria-hidden /> {en ? "Try again" : "إعادة المحاولة"}
        </button>
        <Link href="/admin" className="inline-flex min-h-10 items-center rounded-lg border border-input bg-card px-4 text-sm hover:bg-muted">
          {en ? "Overview" : "الرئيسية"}
        </Link>
      </div>
    </div>
  );
}
