export default function NewInvoiceLoading() {
  return <div className="mx-auto max-w-[1380px] animate-pulse pb-6 motion-reduce:animate-none" role="status" aria-label="جارٍ تحميل نموذج الفاتورة">
    <div className="mb-6 h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
    <div className="mb-3 h-7 w-52 rounded bg-slate-200 dark:bg-slate-800" />
    <div className="mb-8 h-4 w-72 max-w-full rounded bg-slate-100 dark:bg-slate-800" />
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">{[1, 2].map(section => <div key={section} className="theme-card rounded-2xl p-6"><div className="mb-6 h-5 w-36 rounded bg-slate-100 dark:bg-slate-800" />{section === 1 && <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">{[1, 2, 3, 4, 5].map(item => <div key={item} className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>}<div className="grid gap-5 sm:grid-cols-2">{[1, 2, 3, 4, 5, 6].map(item => <div key={item}><div className="mb-2 h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" /><div className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800" /></div>)}</div></div>)}</div>
      <div className="space-y-5"><div className="theme-card h-[460px] rounded-2xl" /><div className="theme-card h-72 rounded-2xl" /></div>
    </div>
  </div>;
}
