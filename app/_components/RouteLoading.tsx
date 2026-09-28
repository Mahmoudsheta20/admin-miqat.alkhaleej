export default function RouteLoading() {
  return <div role="status" aria-label="جاري تحميل الصفحة" className="space-y-5 py-4">
    <span className="sr-only">جاري تحميل الصفحة...</span>
    <div aria-hidden="true" className="h-8 w-40 animate-pulse rounded-lg theme-card-subtle" />
    <div aria-hidden="true" className="space-y-3 rounded-2xl border theme-border p-4 sm:p-6">
      {[0, 1, 2, 3].map(row => <div key={row} className="h-14 w-full animate-pulse rounded-xl theme-card-subtle" />)}
    </div>
  </div>;
}
