import type { HelpGuideData } from "@/app/_components/ui/PageHeader";
export function createHelpGuide(isRTL: boolean): HelpGuideData { return ({
    title: isRTL ? "دليل أسطول المركبات ومتابعة الجاهزية والتراخيص" : "Fleet Management & Readiness Guide",
    summary: isRTL
      ? "يُدار في هذا القسم أسطول حافلات وسيارات شركة ميقات الخليج للنقل البري، مع توثيق اللوحات بالعربية والإنجليزية، السعة الركابية، عداد المسافات، وتواريخ انتهاء الاستمارة والتأمين."
      : "Manages Miqat Al-Khaleej fleet vehicles and buses, tracking Arabic/English plates, passenger capacity, odometer readings, and registration/insurance expiry.",
    cards: [
      {
        title: isRTL ? "١. فئات الأسطول وحالات الجاهزية" : "1. Fleet Categories & Status",
        badge: isRTL ? "إدارة الأسطول" : "Fleet Operations",
        items: [
          {
            label: isRTL ? "تصنيف المركبات" : "Vehicle Classification",
            code: "BUS / COASTER / SUV_VIP",
            description: isRTL
              ? "تحديد فئة المركبة (حافلة، كوستر، جمس VIP، فان، سيدان) وسعة المقاعد لاختيار المركبة المناسبة لحجم الوفد."
              : "Defines vehicle class (Bus, Coaster, VIP SUV, Van, Sedan) and seating capacity for party size matching.",
          },
          {
            label: isRTL ? "حالات التشغيل" : "Operational Statuses",
            code: "AVAILABLE / ON_TRIP / MAINTENANCE",
            description: isRTL
              ? "تتبع ما إذا كانت المركبة جاهزة للتشغيل، أو في رحلة حالية، أو داخل الصيانة الدورية."
              : "Tracks whether a vehicle is available for dispatch, currently on a trip, or undergoing scheduled maintenance.",
          },
        ],
      },
      {
        title: isRTL ? "٢. التراخيص والتأمين والعداد" : "2. Compliance & Mileage",
        badge: isRTL ? "الامتثال النظامي" : "Regulatory Compliance",
        items: [
          {
            label: isRTL ? "صلاحية الاستمارة والتأمين" : "Registration & Insurance Expiry",
            description: isRTL
              ? "مراقبة تواريخ انتهاء رخصة السير (الاستمارة) ووثيقة التأمين لتفادي إيقاف الخدمات أو المخالفات."
              : "Monitors vehicle registration and insurance expiry dates to avoid fines and operational disruption.",
          },
          {
            label: isRTL ? "قراءة عداد المسافات (Odometer)" : "Odometer Tracking",
            description: isRTL
              ? "تحديث المسافة المقطوعة بالكيلومتر لمتابعة مواعيد تغيير الزيوت والإطارات والصيانة الوقائية."
              : "Records kilometers driven to schedule timely oil changes, tyre replacements, and preventative maintenance.",
          },
        ],
      },
      {
        title: isRTL ? "٣. الربط المحاسبي بالمركبة" : "3. Cost Center Accounting",
        badge: isRTL ? "مراكز التكلفة" : "Cost Centers",
        items: [
          {
            label: isRTL ? "الأصول الثابتة للأسطول" : "Fixed Assets",
            code: "1201",
            description: isRTL
              ? "تندرج قيمة أسطول السيارات والحافلات ضمن حساب (1201 - أسطول السيارات والمركبات والحافلات)."
              : "Fleet assets post to account 1201 (Vehicles and Bus Fleet) in the chart of accounts.",
          },
          {
            label: isRTL ? "ربط المصروفات باللوحة" : "Plate Expense Tracking",
            code: "5101 / 5102 / 5104",
            description: isRTL
              ? "عند تسجيل فاتورة وقود أو صيانة أو تأمين في قسم المشتريات، يمكن ربطها برقم لوحة المركبة لتتبع تكلفة كل مركبة."
              : "Supplier fuel, maintenance, and insurance bills link directly to vehicle plates for per-vehicle cost analysis.",
          },
        ],
      },
    ],
    tip: isRTL
      ? "ربط رقم لوحة المركبة بفواتير الوقود والصيانة والعقود يساعدك على معرفة ربحية وتكلفة تشغيل كل مركبة بدقة."
      : "Linking vehicle plates to fuel, repair, and trip contracts provides accurate per-vehicle profitability and operating cost tracking.",
  }); }
