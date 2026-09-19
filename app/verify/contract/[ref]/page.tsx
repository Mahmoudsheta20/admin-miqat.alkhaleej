import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Calendar,
  Clock,
  MapPin,
  Plane,
  User,
  ShieldCheck,
  Building2,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { mapOperationType } from "@/lib/contractStorage";

interface PageProps {
  params: Promise<{ ref: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps) {
  const { ref } = await params;
  return {
    title: `توثيق العقد ${ref} | شركة ميقات الخليج للنقل البري`,
    description: `صفحة التوثيق الرسمية المعتمدة لعقد النقل البري رقم ${ref}`,
  };
}

export default async function ContractVerificationPage({ params }: PageProps) {
  const { ref } = await params;
  const decodedRef = decodeURIComponent(ref);

  const contract = await prisma.contract.findFirst({
    where: {
      OR: [{ referenceNumber: decodedRef }, { id: decodedRef }],
    },
    include: {
      passengers: { orderBy: { sequence: "asc" } },
      captain: true,
      inspection: true,
    },
  });

  if (!contract) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">عقد غير مسجل</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            الرقم المرجعي <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{decodedRef}</span> غير موجود في سجلات عقود شركة ميقات الخليج للنقل البري.
          </p>
          <div className="text-xs text-slate-400">
            إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع إدارة العمليات على الرقم:
            <div className="font-mono font-bold text-slate-700 dark:text-slate-300 mt-1" dir="ltr">
              +966 55 229 3398
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pdfUrl = contract.pdfPath || `/api/contracts/pdf?contractId=${contract.id}`;
  const operationTypeAr = mapOperationType(contract.operationType);
  const issueDate = contract.createdAt
    ? new Date(contract.createdAt).toLocaleDateString("en-GB")
    : contract.tripDate;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans py-8 px-4 sm:px-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <Image
                src="/logo.svg"
                alt="ميقات الخليج"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-600 dark:text-amber-400">نظام توثيق العقود الرقمي</div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                شركة ميقات الخليج للنقل البري
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ترخيص هيئة النقل: <span className="font-mono font-bold">35/00009318</span> • سجل تجاري: <span className="font-mono font-bold">7054842252</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-black">
            <CheckCircle2 className="w-4 h-4" />
            عقد موثق ومعتمد رسمياً
          </div>
        </div>

        {/* Verification Certificate Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
            <div>
              <div className="text-xs text-slate-400 font-bold mb-1">الرقم المرجعي الموحد للعقد</div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-wider">
                {contract.referenceNumber}
              </div>
            </div>
            <div className="flex flex-col sm:items-end">
              <div className="text-xs text-slate-400 font-bold mb-1">تاريخ الإصدار</div>
              <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300" dir="ltr">
                {issueDate}
              </div>
              <span className="mt-1 text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                {operationTypeAr}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Customer */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 font-bold mb-2">
                <User className="w-4 h-4 text-amber-500" />
                الطرف الثاني (العميل)
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">{contract.customerName}</div>
              {contract.customerPhone && (
                <div className="text-slate-500 font-mono mt-1" dir="ltr">
                  {contract.customerPhone}
                </div>
              )}
            </div>

            {/* Captain & Vehicle */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 font-bold mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                الكابتن والمركبة
              </div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {contract.captain?.name || "كابتن ميقات"}
              </div>
              <div className="flex items-center justify-between text-slate-500 font-bold mt-1">
                <span>رقم اللوحة:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{contract.vehiclePlate}</span>
              </div>
            </div>

            {/* Trip Route */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 sm:col-span-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold mb-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                مسار وتوقيت الرحلة
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                <div>
                  <span className="text-slate-400 text-[11px] block">نقطة الانطلاق:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{contract.origin}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">الوجهة المحددة:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{contract.destination}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">تاريخ الرحلة:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">{contract.tripDate} {contract.tripTime}</span>
                </div>
                {contract.flightNumber && (
                  <div>
                    <span className="text-slate-400 text-[11px] block">بيانات الطيران:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200" dir="ltr">
                      {contract.flightCarrier ? `${contract.flightCarrier} - ` : ""}{contract.flightNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Passenger Manifest Summary */}
          {contract.passengers && contract.passengers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  كشف الركاب المعتمد في العقد ({contract.passengers.length} ضيوف)
                </span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500">
                    <tr>
                      <th className="p-2.5">م</th>
                      <th className="p-2.5">إسم الضيف</th>
                      <th className="p-2.5">الجنسية</th>
                      <th className="p-2.5">الهوية / الجواز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {contract.passengers.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2.5 font-mono text-slate-400">{p.sequence}</td>
                        <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">{p.nationality}</td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400" dir="ltr">{p.idNumber || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Direct Download/View PDF Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition shadow-md shadow-amber-500/10"
            >
              <FileText className="w-4 h-4" />
              استعراض وتحميل نسخة العقد الرسمية المعتمدة (PDF)
            </a>
            <a
              href={pdfUrl}
              download={`Contract_${contract.referenceNumber}.pdf`}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-slate-700 dark:text-slate-300 font-bold text-sm transition"
            >
              <Download className="w-4 h-4" />
              تحميل مباشر
            </a>
          </div>
        </div>

        {/* Legal Authority Note */}
        <div className="text-center text-xs text-slate-400 space-y-1">
          <p>تم إصدار وتوثيق هذا العقد إلكترونياً بموجب المادتين (39) و (40) من اللائحة المنظمة لنشاط النقل المتخصص.</p>
          <p>شركة ميقات الخليج للنقل البري • مكة المكرمة • هاتف: +966 55 229 3398</p>
        </div>
      </div>
    </div>
  );
}
