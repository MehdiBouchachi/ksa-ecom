import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-3 text-muted-foreground">ربما تم نقل الصفحة أو حذفها.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-md bg-primary px-5 py-3 font-semibold text-white">الرئيسية</Link>
        <Link href="/products" className="rounded-md border border-input px-5 py-3 font-semibold">المنتجات</Link>
      </div>
    </main>
  );
}
