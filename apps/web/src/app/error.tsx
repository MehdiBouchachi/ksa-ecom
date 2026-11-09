"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-3 text-muted-foreground">نعتذر عن ذلك. حاول مرة أخرى.</p>
      <button onClick={reset} className="mt-6 min-h-11 rounded-md bg-primary px-5 font-semibold text-white">إعادة المحاولة</button>
    </main>
  );
}
