import { notFound } from "next/navigation";
import { backendUrl } from "@/lib/backend";
import type { ApiResult } from "@/lib/backend";

interface PageProps { params: Promise<{ id: string }> }
interface Verification { id: string; inspectionDate: string; driverDeclared: boolean }
export async function generateMetadata() { return { title: "توثيق فحص المركبة | ميقات الخليج" }; }
export default async function InspectionVerification({ params }: PageProps) {
  const { id } = await params;
  const response = await fetch(backendUrl(`/inspections/verify/${encodeURIComponent(id)}`), { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("تعذر الاتصال بخدمة التوثيق");
  const result: ApiResult<Verification> = await response.json();
  if (!result.success || !result.data) throw new Error("تعذر التحقق من الفحص");
  return <main dir="rtl" className="min-h-screen flex items-center justify-center p-6"><section className="theme-card rounded-2xl p-8 max-w-lg w-full">
    <h1 className="text-2xl font-bold mb-6">توثيق فحص المركبة</h1>
    <p className="font-mono break-all">{result.data.id}</p>
    <p className="my-3">{new Date(result.data.inspectionDate).toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh" })}</p>
    <p>{result.data.driverDeclared ? "تم تسجيل إقرار السائق" : "لم يتم تسجيل إقرار السائق"}</p>
  </section></main>;
}
