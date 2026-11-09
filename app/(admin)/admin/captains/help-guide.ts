import type { HelpGuideData } from "@/app/_components/ui/PageHeader";
export function createHelpGuide(isRTL: boolean): HelpGuideData { return ({
    title: isRTL ? "دليل إدارة الكباتن ورخص القيادة وإسناد المركبات" : "Captains & Drivers Management Guide",
    summary: isRTL
      ? "يُدار في هذا القسم سجل كباتن شركة ميقات الخليج للنقل البري، بيانات الهوية الوطنية/الإقامة، رخص القيادة وتواريخ انتهائها، المركبة المسندة لكل كابتن، وحالة الفحص اليومي."
      : "Manages Miqat Al-Khaleej captains registry, national/residence IDs, driving licenses and expiry dates, assigned vehicle plates, and daily safety inspection records.",
    cards: [
      {
        title: isRTL ? "١. بيانات الكابتن والاعتماد" : "1. Captain Credentials & Licensing",
        badge: isRTL ? "السجل الرسمي" : "Official Registry",
        items: [
          {
            label: isRTL ? "الهوية ورخصة القيادة" : "National ID & Driving License",
            description: isRTL
              ? "توثيق رقم الهوية/الإقامة ورقم رخصة القيادة العمومي وتاريخ انتهائها لضمان الامتثال النظامي."
              : "Verifies national/iqama ID and commercial driver license expiry dates for regulatory compliance.",
          },
          {
            label: isRTL ? "إسناد المركبة (Vehicle Plate)" : "Assigned Vehicle Plate",
            description: isRTL
              ? "ربط الكابتن بلوحة المركبة المخصصة له لتعبئتها تلقائياً في شاشة الفحص اليومي وعقود النقل."
              : "Links captain to their assigned vehicle plate to auto-populate daily inspection and transport contracts.",
          },
        ],
      },
      {
        title: isRTL ? "٢. بوابة الكابتن وكلمات المرور" : "2. Driver Portal & Security",
        badge: isRTL ? "الأمان والدخول" : "Portal Security",
        items: [
          {
            label: isRTL ? "إنشاء كلمة مرور مؤقتة" : "Temporary Passwords",
            description: isRTL
              ? "عند إضافة كابتن جديد أو الضغط على أيقونة المفتاح، يُصدر النظام كلمة مرور مؤقتة لدخول بوابة الكابتن."
              : "Issues temporary access credentials upon captain creation or password reset for the mobile inspection portal.",
          },
          {
            label: isRTL ? "التنشيط والإيقاف الفوري" : "Instant Activation / Deactivation",
            description: isRTL
              ? "يمكن تفعيل أو إيقاف حساب الكابتن بضغطة واحدة دون فقدان سجل عقوده وفحوصاته السابقة."
              : "Instantly toggle account active state while safely preserving all historical trips and inspections.",
          },
        ],
      },
      {
        title: isRTL ? "٣. الربط التشغيلي والمحاسبي" : "3. Operations & Payroll Link",
        badge: isRTL ? "التكامل" : "Integration",
        items: [
          {
            label: isRTL ? "حالة فحص اليوم" : "Today's Inspection Status",
            description: isRTL
              ? "يظهر أمام كل كابتن شارة فورية توضح ما إذا أتم فحص السلامة اليومي للمركبة أم بانتظار الفحص."
              : "Live indicator showing whether the captain has completed today's vehicle safety inspection.",
          },
          {
            label: isRTL ? "مسير الرواتب والعهد" : "Salaries & Custody",
            code: "5105 / 1104",
            description: isRTL
              ? "ترتبط مصروفات رواتب وعمولات السائقين في قسم المشتريات بحساب (5105 - رواتب وعمولات السائقين) كمعاملة خارج نطاق الضريبة (0%)."
              : "Driver salaries and commissions link to account 5105 as non-taxable transactions (0% VAT).",
          },
        ],
      },
    ],
    tip: isRTL
      ? "استخدم زر المفتاح (إعادة تعيين كلمة المرور) لإصدار بيانات دخول جديدة للكابتن ونسخها بضغطة واحدة."
      : "Use the key icon to generate new temporary login credentials and copy them with one click.",
  }); }
