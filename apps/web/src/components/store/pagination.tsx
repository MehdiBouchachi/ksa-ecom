import Link from "next/link";

export function Pagination({ page, pageSize, total, basePath, params }: { page: number; pageSize: number; total: number; basePath: string; params: URLSearchParams }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams(params);
    if (p === 1) sp.delete("page");
    else sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <nav aria-label="الصفحات" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 && <Link className="min-h-11 rounded-md border border-input px-4 py-2.5" href={href(page - 1)} rel="prev">السابق</Link>}
      <span className="px-2 text-sm text-muted-foreground">صفحة {page} من {pages}</span>
      {page < pages && <Link className="min-h-11 rounded-md border border-input px-4 py-2.5" href={href(page + 1)} rel="next">التالي</Link>}
    </nav>
  );
}
