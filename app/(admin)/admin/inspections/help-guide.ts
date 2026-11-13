import type { HelpGuideData } from "@/app/_components/ui/PageHeader";
export function createHelpGuide(isRTL: boolean): HelpGuideData { return ({
    title: isRTL ? "دليل الفحص اليومي للكباتن والمركبات (16 بند سلامة)" : "Daily Vehicle & Captain Safety Inspection Guide (16 Checks)",
    summary: isRTL
      ? "يضمن هذا القسم عدم انطلاق أي مركبة في رحلة رسمية قبل التحقق من جاهزيتها الميكانيكية وتوفر أدوات السلامة والطوارئ على متنها وتوثيق إقرار السائق."
      : "Ensures no vehicle departs on an official passenger trip without verified mechanical readiness, emergency equipment, and logged driver safety declaration.",
    cards: [
      {
        title: isRTL ? "١. بنود لوحة القيادة والمحرك" : "1. Dashboard & Engine Vital Signs",
        badge: isRTL ? "٦ بنود ميكانيكية" : "6 Mechanical Checks",
        items: [
          {
            label: isRTL ? "المؤشرات الحيوية" : "Engine Vitals",
            description: isRTL
              ? "مؤشر الوقود، مؤشر حرارة المحرك، ضغط الزيت، ولمبة فحص المحرك (Check Engine)."
              : "Fuel gauge, engine temperature, oil pressure, and check engine indicator.",
          },
          {
            label: isRTL ? "أنظمة المكابح والتحذير" : "Braking & Warning Lights",
            description: isRTL
              ? "سلامة نظام الفرامل المانعة للانغلاق (ABS) وخلو الطبلون من أي إشارات تحذيرية حرجة."
              : "ABS warning lamp status and absence of critical alert lights.",
          },
        ],
      },
      {
        title: isRTL ? "٢. الفحص الخارجي وأدوات السلامة" : "2. Exterior & Emergency Gear",
        badge: isRTL ? "١٠ بنود أمان" : "10 Safety Checks",
        items: [
          {
            label: isRTL ? "الهيكل والإطارات والأنوار" : "Tyres, Body & Lights",
            description: isRTL
              ? "سلامة الإطارات، الأنوار الأمامية، الإشارات الجانبية، المرايا، وعدم وجود أي تسريبات أسفل المركبة."
              : "Tyre pressure, head/tail lights, turn signals, mirrors, and inspection for fluid leaks.",
          },
          {
            label: isRTL ? "تجهيزات الطوارئ الإلزامية" : "Mandatory Safety Equipment",
            description: isRTL
              ? "طفاية الحريق، مثلث التحذير العاكس، حقيبة الإسعافات الأولية، مطرقة كسر الزجاج، وأحزمة الأمان."
              : "Valid fire extinguisher, reflective warning triangle, first aid kit, window hammer, and seat belts.",
          },
        ],
      },
      {
        title: isRTL ? "٣. طرق الاعتماد والتوثيق" : "3. Approval & Documentation",
        badge: isRTL ? "التشغيل السريع" : "Quick Dispatch",
        items: [
          {
            label: isRTL ? "الاعتماد الفوري المباشر" : "Instant Direct Pass",
            description: isRTL
              ? "يُتيح للمشرف اعتماد جاهزية الكابتن والمركبة بضغطة زر واحدة بعد المعاينة الميدانية."
              : "Allows operations supervisor to pass an active captain and assigned vehicle with one click.",
          },
          {
            label: isRTL ? "تقرير الفحص الرسمي PDF وواتساب" : "Official Inspection PDF & WhatsApp",
            description: isRTL
              ? "يُصدر النظام شهادة فحص يومية قابلة للطباعة وتربط بالعقود، مع إمكانية إرسالها مباشرة عبر واتساب للكابتن."
              : "Generates an official printable PDF certificate linked to daily contracts, with direct WhatsApp sharing to the captain.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "انقر على «اجتياز فحص مباشر» أمام أي كابتن لاعتماد فحص اليوم فوراً، أو استخدم «فحص مخصص جديد» لتسجيل ملاحظات تفصيلية على بنود محددة."
      : "Click 'Direct Pass' next to any captain to approve immediately, or use 'New Custom Inspection' to record detailed observations.",
  }); }
