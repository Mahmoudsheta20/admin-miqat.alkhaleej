import { LocalizedText, LocalizedDate } from "@/lib/ui-text";
import { localizedMetadataTitle } from "@/lib/metadata";
import { notFound } from "next/navigation";
import { backendUrl } from "@/lib/backend";
import type { ApiResult } from "@/lib/backend";

interface PageProps { params: Promise<{ id: string }> }
interface Verification { id: string; inspectionDate: string; driverDeclared: boolean }
export async function generateMetadata() { return { title: await localizedMetadataTitle("توثيق فحص المركبة | ميقات الخليج") }; }
export default async function InspectionVerification({ params }: PageProps) {
  const { id } = await params;
  const response = await fetch(backendUrl(`/inspections/verify/${encodeURIComponent(id)}`), { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("تعذر الاتصال بخدمة التوثيق");
  const result: ApiResult<Verification> = await response.json();
  if (!result.success || !result.data) throw new Error("تعذر التحقق من الفحص");
  return <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-main)] text-[var(--text-main)]"><section className="theme-card rounded-2xl border border-[var(--border-color)] p-8 max-w-lg w-full space-y-4">
    <h1 className="text-2xl font-bold text-[var(--text-main)]"><LocalizedText value="توثيق فحص المركبة"/></h1>
    <p className="font-mono break-all text-sm text-[var(--text-muted)]"><bdi>{result.data.id}</bdi></p>
    <p className="text-sm font-medium text-[var(--text-main)]"><LocalizedDate value={result.data.inspectionDate}/></p>
    <p className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${result.data.driverDeclared ? "bg-emerald-500/12 border-emerald-600/35 text-emerald-800 dark:bg-emerald-950/45 dark:border-emerald-500/35 dark:text-emerald-300" : "bg-[var(--accent-surface)] border-amber-600/35 text-[var(--accent-gold)]"}`}><LocalizedText value={result.data.driverDeclared ? "تم تسجيل إقرار السائق" : "لم يتم تسجيل إقرار السائق"}/></p>
  </section></main>;
}
