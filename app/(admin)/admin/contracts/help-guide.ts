import type { HelpGuideData } from "@/app/_components/ui/PageHeader";
export function createHelpGuide(isRTL: boolean): HelpGuideData { return ({
    title: isRTL ? "دليل العقود الرسمية وتوثيق الرحلات وكشوف الركاب" : "Official Contracts & Manifest Guide",
    summary: isRTL
      ? "يُستخدم هذا القسم لإصدار وتوثيق عقود النقل البري المعتمدة وفق اشتراطات الهيئة العامة للنقل (TGA)، مع ربط كل عقد بالكابتن والمركبة وفحص السلامة اليومي وكشف الركاب."
      : "Issues and archives official passenger transport contracts per TGA regulations, linking each contract to captain, vehicle, safety inspection, and passenger manifest.",
    cards: [
      {
        title: isRTL ? "١. أنواع عقود التشغيل" : "1. Operation Types",
        badge: isRTL ? "أنماط النقل" : "Transport Modes",
        items: [
          {
            label: isRTL ? "حج وعمرة (HAJJ_UMRAH)" : "Hajj & Umrah",
            description: isRTL
              ? "عقود نقل المعتمرين والحجاج والزوار بين المطارات والفنادق والحرمين الشريفين."
              : "Pilgrim and visitor transport between airports, hotels, and the Holy Mosques.",
          },
          {
            label: isRTL ? "توصيل مطارات وكبار شخصيات" : "Airport & VIP",
            code: "AIRPORT / VIP",
            description: isRTL
              ? "رحلات الاستقبال والتوديع بالمطارات مع توثيق الناقل الجوي ورقم الرحلة ووقت الوصول."
              : "Airport pick-up and drop-off with flight carrier, number, and arrival tracking.",
          },
          {
            label: isRTL ? "نقل بين المدن وتعاقدات" : "Intercity & Charter",
            code: "INTERCITY / CHARTER",
            description: isRTL
              ? "عقود تشغيل الحافلات والمركبات للوفود والشركات والرحلات السياحية."
              : "Bus and fleet chartering for corporate delegations and tourist groups.",
          },
        ],
      },
      {
        title: isRTL ? "٢. المتطلبات النظامية للعقد" : "2. Regulatory Requirements",
        badge: "TGA & QR",
        items: [
          {
            label: isRTL ? "ربط الفحص اليومي" : "Daily Inspection Link",
            description: isRTL
              ? "يتحقق النظام من وجود فحص سلامة يومي معتمد للكابتن والمركبة قبل انطلاق الرحلة."
              : "System verifies an approved daily pre-trip vehicle safety inspection before dispatch.",
          },
          {
            label: isRTL ? "كشف الركاب (Passenger Manifest)" : "Passenger Manifest",
            description: isRTL
              ? "إدراج أسماء الركاب وجنسياتهم وأرقام الهوية/الجواز داخل وثيقة العقد الرسمية."
              : "Embeds passenger names, nationalities, and ID/passport numbers in the contract.",
          },
          {
            label: isRTL ? "رمز التحقق الإلكتروني QR" : "Electronic QR Code",
            description: isRTL
              ? "يحتوي كل عقد PDF على رمز QR رسمي للتحقق الفوري من صحة العقد وسريانه ميدانياً."
              : "Every contract PDF includes an official QR code for instant field validation.",
          },
        ],
      },
      {
        title: isRTL ? "٣. الإجراءات السريعة" : "3. Quick Actions",
        badge: isRTL ? "أدوات المشرف" : "Supervisor Tools",
        items: [
          {
            label: isRTL ? "إنشاء رحلة عودة (Reverse Trip)" : "Reverse Trip Generation",
            description: isRTL
              ? "توليد عقد رحلة عودة بضغطة واحدة بنفس كشف الركاب والكابتن مع عكس نقطة الانطلاق والوجهة."
              : "One-click return contract generation with reversed route and mirrored manifest.",
          },
          {
            label: isRTL ? "معاينة وتنزيل PDF" : "PDF Preview & Download",
            description: isRTL
              ? "استعراض وثيقة العقد الرسمي وطباعتها أو إرسالها للكابتن والعميل مباشرة."
              : "Preview and download the official contract document for printing or instant sharing.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "يمكنك فلترة العقود حسب حالة الفحص (مفحوص / بدون فحص) أو نوع العملية أو اسم الكابتن من البطاقات التفاعلية أدناه."
      : "Filter contracts by inspection status (inspected / pending), operation type, or captain using the interactive cards below.",
  }); }
