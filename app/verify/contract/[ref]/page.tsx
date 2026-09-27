import { notFound } from "next/navigation";
import { backendUrl } from "@/lib/backend";
import type { ApiResult } from "@/lib/backend";
import type { ContractStatus } from "@/lib/types";

interface PageProps { params: Promise<{ ref: string }> }
interface Verification { referenceNumber: string; status: ContractStatus; issueDate: string | null }
const STATUS_LABELS: Record<ContractStatus, string> = {
  PENDING_REVIEW: "قيد المراجعة", APPROVED: "معتمد", REJECTED: "مرفوض",
  ACTIVE: "نشط", EXPIRED: "منتهي", CANCELLED: "ملغي",
};
export async function generateMetadata({ params }: PageProps) {
  const { ref } = await params;
  return { title: `توثيق العقد ${ref} | ميقات الخليج` };
}
export default async function ContractVerificationPage({ params }: PageProps) {
  const { ref } = await params;
  const response = await fetch(backendUrl(`/contracts/verify/${encodeURIComponent(ref)}`), {
    cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("تعذر الاتصال بخدمة التوثيق");
  const result: ApiResult<Verification> = await response.json();
  if (!result.success || !result.data) throw new Error("تعذر التحقق من العقد");
  const contract = result.data;
  return (
    <main className="min-h-screen flex items-center justify-center p-6" dir="rtl">
      <section className="theme-card rounded-2xl p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold mb-6">توثيق عقد ميقات الخليج</h1>
        <dl className="space-y-3">
          <dt>الرقم المرجعي</dt><dd className="font-mono">{contract.referenceNumber}</dd>
          <dt>الحالة</dt><dd>{STATUS_LABELS[contract.status]}</dd>
          {contract.issueDate && <><dt>تاريخ الإصدار</dt><dd className="font-mono">{contract.issueDate}</dd></>}
        </dl>
      </section>
    </main>
  );
}
