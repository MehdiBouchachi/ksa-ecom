/** Instant skeleton while an admin page streams in (shown inside the persistent shell). */
export default function AdminLoading() {
  return (
    <div className="fade-in" aria-busy="true" aria-live="polite">
      <div className="mb-6 space-y-2">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton mt-3 h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-border bg-card p-5">
        <div className="skeleton h-5 w-40" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-9 w-full" />)}
        </div>
      </div>
    </div>
  );
}
