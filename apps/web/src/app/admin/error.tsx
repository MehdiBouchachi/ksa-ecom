"use client";

/** Server-side FORBIDDEN/UNAUTHENTICATED errors from guards land here (no data is rendered). */
export default function AdminError({ error }: { error: Error & { digest?: string } }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-bold">غير مصرح أو حدث خطأ</h1>
      <p className="mt-2 text-sm text-muted-foreground">ليست لديك صلاحية لهذه الصفحة، أو حدث خطأ غير متوقع.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-muted-foreground" dir="ltr">ref: {error.digest}</p>}
    </div>
  );
}
