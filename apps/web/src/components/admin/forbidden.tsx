/** Rendered for authenticated staff lacking the role (e.g. a Manager guessing /admin/team). No data is loaded. */
export function Forbidden() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-bold">غير مصرح أو حدث خطأ</h1>
      <p className="mt-2 text-sm text-muted-foreground">هذه الصفحة متاحة للمدير العام فقط.</p>
    </div>
  );
}
