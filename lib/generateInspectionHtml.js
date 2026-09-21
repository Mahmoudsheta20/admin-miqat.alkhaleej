import fs from "fs";
import path from "path";

/**
 * Server-Side HTML Generator for Official Vehicle Inspection Document (سجل الفحص التشغيلي اليومي للمركبة)
 * Inlines all assets (base64 PNGs, SVGs, Google Fonts) for 100% reliable offline headless PDF rendering.
 * Faithfully matches the exact layout & styling of Page 3 of the official Miqat Al-Khaleej transport contract.
 */
export function generateInspectionHtml(data) {
  const { company, inspection, captain, options } = data;

  // Helper to read a public file as base64 data URI
  const getPublicFileDataUri = (relativePath, mimeType) => {
    try {
      const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
      const fullPath = path.join(process.cwd(), "public", cleanPath);
      if (fs.existsSync(fullPath)) {
        const fileBuffer = fs.readFileSync(fullPath);
        return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      }
    } catch (e) {
      console.warn("Could not load asset:", relativePath, e);
    }
    return relativePath;
  };

  // Base64 assets
  const logoDataUri = getPublicFileDataUri("logo.svg", "image/svg+xml");
  const sealDataUri = fs.existsSync(path.join(process.cwd(), "public", "company-seal.png"))
    ? getPublicFileDataUri("company-seal.png", "image/png")
    : getPublicFileDataUri("WhatsApp Image 2026-09-10 at 15.56.15.jpeg", "image/jpeg");
  const whatsappDataUri = getPublicFileDataUri("whatsapp.png", "image/png");
  const qrDataUri = inspection?.qrCodeDataUri || getPublicFileDataUri("contract-qr.png", "image/png");

  // Checklist Items Defaults
  const defaultDashboard = [
    { id: "fuel", nameAr: "مؤشر الوقود", sound: true, notes: "" },
    { id: "temp", nameAr: "مؤشر الحرارة", sound: true, notes: "" },
    { id: "oil_pressure", nameAr: "مؤشر ضغط الزيت", sound: true, notes: "" },
    { id: "check_engine", nameAr: "لمبة فحص المحرك", sound: true, notes: "" },
    { id: "abs", nameAr: "نظام ABS للفرامل", sound: true, notes: "" },
    { id: "warning_light", nameAr: "لمبات التحذير واللوحة", sound: true, notes: "" },
  ];

  const defaultExternal = [
    { id: "tires", nameAr: "الإطارات وضغط الهواء", sound: true, notes: "" },
    { id: "lights", nameAr: "الأنوار الأمامية والخلفية", sound: true, notes: "" },
    { id: "signals", nameAr: "الإشارات التحذيرية والجانبية", sound: true, notes: "" },
    { id: "glass", nameAr: "الزجاج والمرايا الجانبية", sound: true, notes: "" },
    { id: "leaks", nameAr: "عدم وجود تسريبات وقود أو زيوت", sound: true, notes: "" },
  ];

  const defaultSafety = [
    { id: "extinguisher", nameAr: "طفاية حريق صالحة ومثبتة", sound: true, notes: "" },
    { id: "triangle", nameAr: "مثلث تحذيري عاكس", sound: true, notes: "" },
    { id: "first_aid", nameAr: "حقيبة إسعافات أولية مكتملة", sound: true, notes: "" },
    { id: "hammer", nameAr: "مطرقة كسر الزجاج للطوارئ", sound: true, notes: "" },
    { id: "belts", nameAr: "أحزمة الأمان لجميع المقاعد", sound: true, notes: "" },
  ];

  const dashboardItems = (inspection?.dashboard && inspection.dashboard.length > 0)
    ? inspection.dashboard
    : defaultDashboard;
  const externalItems = (inspection?.external && inspection.external.length > 0)
    ? inspection.external
    : defaultExternal;
  const safetyItems = (inspection?.safety && inspection.safety.length > 0)
    ? inspection.safety
    : defaultSafety;

  const totalPoints = dashboardItems.length + externalItems.length + safetyItems.length;
  const passedPoints =
    dashboardItems.filter((i) => i.sound).length +
    externalItems.filter((i) => i.sound).length +
    safetyItems.filter((i) => i.sound).length;

  // Cross-device resilient vector icons
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const SVG_CROSS = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  const inspectionCode = inspection?.code || (inspection?.id ? inspection.id.slice(0, 8).toUpperCase() : "INSP-001");
  const inspectionDate = inspection?.date || new Date().toLocaleDateString("en-GB");
  const inspectionTime = inspection?.time || new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
  const companyNameAr = company?.nameAr || "شركة ميقات الخليج للنقل البري";
  const companyCr = company?.crNumber || company?.unifiedNumber || "7054842252";
  const companyLicense = company?.licenseNumber || "35/00009318";
  const companyCity = company?.cityAr || "المملكة العربية السعودية - مكة المكرمة";
  const captainName = captain?.name || "علي أحمد غلام أحمد";
  const vehiclePlate = inspection?.vehiclePlate || captain?.assignedVehiclePlate || "ا ص ل 7223";

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>سجل الفحص التشغيلي اليومي للمركبة - ${inspectionCode}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Zain:ital,wght@0,300;0,400;0,700;0,800;0,900;1,400&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      color: #090e17;
      font-family: 'Tajawal', 'Zain', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, 'Noto Sans Arabic', sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    /* Page Setup - Strict 297mm A4 boundary */
    .inspection-page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      padding: 7mm 12mm 6mm 12mm;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      position: relative;
      overflow: hidden;
    }

    /* Header Styles */
    .header-container {
      width: 100%;
      margin-bottom: 3px;
    }
    .header-grid {
      display: grid;
      grid-template-columns: 1.15fr auto 1.15fr;
      align-items: center;
      padding-bottom: 4px;
    }
    .header-right {
      text-align: right;
    }
    .company-name {
      font-size: 17.5px;
      font-weight: 900;
      color: #090e17;
      line-height: 1.3;
      letter-spacing: -0.2px;
    }
    .company-sub {
      font-size: 12.5px;
      font-weight: 800;
      color: #334155;
      margin-top: 2px;
    }
    .header-center {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0 10px;
    }
    .header-logo {
      height: 56px;
      max-width: 170px;
      object-fit: contain;
    }
    .header-left {
      text-align: left;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .meta-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      line-height: 1.45;
      white-space: nowrap;
    }
    .meta-label {
      font-weight: 800;
      color: #475569;
    }
    .meta-val {
      font-weight: 900;
      color: #090e17;
    }
    .meta-ref-num {
      font-size: 14.5px;
      color: #b45309;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .header-divider {
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, #64748b 0%, #090e17 50%, #64748b 100%);
      margin-top: 3px;
      margin-bottom: 5px;
    }

    /* Page Title */
    .page-title {
      text-align: center;
      font-size: 21px;
      font-weight: 900;
      color: #090e17;
      margin: 3px 0 6px 0;
      letter-spacing: -0.3px;
      position: relative;
    }

    /* Vehicle & Inspection Metadata */
    .inspection-meta-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 18px;
      margin-bottom: 6px;
      padding: 6px 14px;
      background: #f1f5f9;
      border: 1.5px solid #64748b;
      border-radius: 6px;
      font-size: 13px;
    }
    .insp-meta-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .insp-label {
      font-weight: 800;
      color: #1e293b;
      min-width: 75px;
      font-size: 12px;
    }
    .insp-val {
      font-weight: 900;
      color: #090e17;
      font-size: 13px;
    }
    .plate-badge {
      display: inline-block;
      padding: 1px 8px;
      background: #fef3c7;
      border: 1px solid #d97706;
      border-radius: 4px;
      letter-spacing: 1px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 900;
      color: #090e17;
      margin: 6px 0 2.5px 0;
      text-align: right;
    }

    .insp-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      border: 1.5px solid #64748b;
      margin-bottom: 4px;
    }
    .insp-table th {
      background-color: #e2e8f0;
      color: #090e17;
      font-size: 12px;
      font-weight: 900;
      padding: 3.5px 4px;
      line-height: 1.2;
      border: 1.5px solid #64748b;
    }
    .insp-table td {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 4px;
      line-height: 1.2;
      border: 1px solid #94a3b8;
      height: 23px;
      color: #090e17;
      vertical-align: middle;
    }
    .insp-table tr:nth-child(even) td {
      background-color: #f1f5f9;
    }
    .insp-col-item {
      width: 45%;
      text-align: right;
      padding-right: 10px !important;
      font-weight: 800;
    }
    .insp-col-check {
      width: 17%;
    }
    .insp-col-notes {
      width: 21%;
    }
    .check-mark {
      font-weight: 900;
      font-size: 16px;
      color: #059669;
      line-height: 1;
    }
    .cross-mark {
      font-weight: 900;
      font-size: 15px;
      color: #dc2626;
      line-height: 1;
    }

    /* Notes Box (if any) */
    .notes-banner {
      margin-top: 4px;
      padding: 4px 10px;
      background: #fefce8;
      border: 1px dashed #ca8a04;
      border-radius: 4px;
      font-size: 11.5px;
      text-align: right;
      color: #854d0e;
    }

    /* Declaration & Bottom Row */
    .page3-declaration-section {
      margin-top: 6px;
      text-align: center;
      padding: 7px 14px 4px 14px;
      background: #f1f5f9;
      border: 1.5px solid #64748b;
      border-radius: 6px;
    }
    .declaration-title {
      font-size: 13.5px;
      font-weight: 900;
      color: #090e17;
      margin-bottom: 2px;
    }
    .declaration-text {
      font-size: 11.5px;
      font-weight: 600;
      color: #090e17;
      margin: 0 0 5px 0;
      line-height: 1.45;
    }
    .page3-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 4px;
    }
    .page3-driver-info {
      font-size: 13.5px;
      font-weight: 900;
      color: #090e17;
      text-align: right;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .page3-seal-container {
      width: 80px;
      height: 75px;
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    .page3-seal-container .stamp-img {
      width: 74px;
      height: 74px;
      object-fit: contain;
      transform: rotate(-3deg);
    }

    /* Footer Styles */
    .footer-divider-line {
      width: 100%;
      height: 1.5px;
      background: linear-gradient(90deg, #94a3b8 0%, #475569 50%, #94a3b8 100%);
      margin-top: 5px;
      margin-bottom: 3px;
    }
    .footer-container {
      width: 100%;
      padding-top: 1px;
      box-sizing: border-box;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .footer-licence {
      width: 120px;
      flex-shrink: 0;
      text-align: right;
      font-size: 10.5px;
      font-weight: 700;
      color: #64748b;
      line-height: 1.35;
    }
    .footer-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .whatsapp-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }
    .whatsapp-icon {
      width: 19px;
      height: 19px;
      object-fit: contain;
    }
    .phone-text {
      font-size: 14px;
      font-weight: 900;
      color: #090e17;
      font-family: 'Outfit', sans-serif;
      letter-spacing: 0.5px;
    }
    .page-number {
      font-size: 11.5px;
      font-weight: 800;
      color: #475569;
      font-family: 'Tajawal', 'Outfit', sans-serif;
    }
    .footer-qr {
      width: 120px;
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
    .qr-img {
      width: 65px;
      height: 65px;
      max-width: 65px;
      max-height: 65px;
      object-fit: contain;
    }
    .font-mono {
      font-family: 'Outfit', monospace;
    }
  </style>
</head>
<body>

  <div class="inspection-page">
    <div>
      <!-- Header -->
      <div class="header-container" dir="rtl">
        <div class="header-grid">
          <!-- Right: Company Info -->
          <div class="header-right">
            <div class="company-name">${companyNameAr}</div>
            <div class="company-sub">سجل تجاري: <span class="font-mono" dir="ltr">${companyCr}</span></div>
            <div class="company-sub">${companyCity}</div>
          </div>

          <!-- Center: Logo -->
          <div class="header-center">
            <img src="${logoDataUri}" alt="ميقات الخليج" class="header-logo" />
          </div>

          <!-- Left: Inspection Document Meta -->
          <div class="header-left">
            <div class="meta-row">
              <span class="meta-label">نوع المستند:</span>
              <span class="meta-val">محضر فحص تشغيلي وفني</span>
            </div>
            <div class="meta-row" dir="rtl">
              <span class="meta-label">كود الفحص:</span>
              <span class="meta-val font-mono meta-ref-num"><bdi dir="ltr">#${inspectionCode}</bdi></span>
            </div>
            <div class="meta-row">
              <span class="meta-label">تاريخ الإصدار:</span>
              <span class="meta-val font-mono" dir="ltr">${inspectionDate}</span>
            </div>
          </div>
        </div>
        <div class="header-divider"></div>
      </div>

      <div class="page-title">سجل الفحص التشغيلي والجاهزية الفنية للمركبة</div>

      <!-- Vehicle & Inspection Metadata -->
      <div class="inspection-meta-list">
        <div class="insp-meta-row">
          <span class="insp-label">اسم الشركة:</span>
          <span class="insp-val">${companyNameAr}</span>
        </div>
        <div class="insp-meta-row">
          <span class="insp-label">لوحة المركبة:</span>
          <span class="insp-val font-mono plate-badge" style="color: #b45309;">${vehiclePlate}</span>
        </div>
        <div class="insp-meta-row">
          <span class="insp-label">اسم السائق:</span>
          <span class="insp-val">${captainName}</span>
        </div>
        <div class="insp-meta-row">
          <span class="insp-label">تاريخ الفحص:</span>
          <span class="insp-val font-mono" dir="ltr">${inspectionDate}</span>
        </div>
      </div>

      <!-- Section 1: Dashboard -->
      <div class="section-title">أولاً: فحص مؤشرات لوحة القيادة والعدادات</div>
      <table class="insp-table">
        <thead>
          <tr>
            <th class="insp-col-item">البند الفني المفحوص</th>
            <th class="insp-col-check">سليم (100%)</th>
            <th class="insp-col-check">غير سليم</th>
            <th class="insp-col-notes">الملاحظات التشغيلية</th>
          </tr>
        </thead>
        <tbody>
          ${dashboardItems.map((item) => `
            <tr>
              <td class="insp-col-item">${item.nameAr}</td>
              <td class="insp-col-check">${item.sound ? `<span class="check-mark">${SVG_CHECK}</span>` : ""}</td>
              <td class="insp-col-check">${!item.sound ? `<span class="cross-mark">${SVG_CROSS}</span>` : ""}</td>
              <td class="insp-col-notes">${item.notes || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <!-- Section 2: External Inspection -->
      <div class="section-title">ثانياً: الفحص الخارجي وهيكل المركبة</div>
      <table class="insp-table">
        <thead>
          <tr>
            <th class="insp-col-item">البند الفني المفحوص</th>
            <th class="insp-col-check">سليم (100%)</th>
            <th class="insp-col-check">غير سليم</th>
            <th class="insp-col-notes">الملاحظات التشغيلية</th>
          </tr>
        </thead>
        <tbody>
          ${externalItems.map((item) => `
            <tr>
              <td class="insp-col-item">${item.nameAr}</td>
              <td class="insp-col-check">${item.sound ? `<span class="check-mark">${SVG_CHECK}</span>` : ""}</td>
              <td class="insp-col-check">${!item.sound ? `<span class="cross-mark">${SVG_CROSS}</span>` : ""}</td>
              <td class="insp-col-notes">${item.notes || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <!-- Section 3: Safety & Security Tools -->
      <div class="section-title">ثالثاً: أدوات ومتطلبات الأمن والسلامة الإلزامية</div>
      <table class="insp-table">
        <thead>
          <tr>
            <th class="insp-col-item">البند الفني المفحوص</th>
            <th class="insp-col-check">سليم (100%)</th>
            <th class="insp-col-check">غير سليم</th>
            <th class="insp-col-notes">الملاحظات التشغيلية</th>
          </tr>
        </thead>
        <tbody>
          ${safetyItems.map((item) => `
            <tr>
              <td class="insp-col-item">${item.nameAr}</td>
              <td class="insp-col-check">${item.sound ? `<span class="check-mark">${SVG_CHECK}</span>` : ""}</td>
              <td class="insp-col-check">${!item.sound ? `<span class="cross-mark">${SVG_CROSS}</span>` : ""}</td>
              <td class="insp-col-notes">${item.notes || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>



      <!-- Declaration -->
      <div class="page3-declaration-section">
        <div class="declaration-title">إقرار وتعهد الفحص التشغيلي والفني للمركبة</div>
        <p class="declaration-text">
          ${inspection?.declarationText || "أقر أنا السائق المعتمد أعلاه بأنني قمت بإجراء الفحص الفني والتشغيلي الشامل للمركبة والتأكد التام من جاهزيتها وسلامتها التشغيلية ومطابقتها لاشتراطات السلامة المقررة من الهيئة العامة للنقل قبل بدء التشغيل."}
        </p>

        <div class="page3-bottom-row">
          <!-- Driver Info at right -->
          <div class="page3-driver-info">
            <div>
              <span style="color: #475569;">السائق المعتمد:</span>
              <strong style="margin-right: 4px; color: #b45309;">${captainName}</strong>
            </div>
            <div style="font-size: 11.5px; color: #059669; font-weight: 800;">
              ✓ تم الفحص وتوثيق الجاهزية التشغيلية إلكترونياً
            </div>
          </div>

          <!-- Stamp at bottom left -->
          <div class="page3-seal-container">
            ${options?.showStamp !== false ? `<img src="${sealDataUri}" alt="ختم الشركة" class="stamp-img" />` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Official Document Footer -->
    <div>
      <div class="footer-divider-line"></div>
      <div class="footer-container" dir="ltr">
        <div class="footer-content">
          <!-- Left: Licence Info -->
          <div class="footer-licence" dir="rtl">
            <div>ترخيص نقل بري:</div>
            <div class="font-mono" style="font-weight: 800; color: #334155;">${companyLicense}</div>
          </div>

          <!-- Center: WhatsApp & Page # -->
          <div class="footer-center">
            <div class="whatsapp-row">
              <img src="${whatsappDataUri}" alt="WhatsApp" class="whatsapp-icon" />
              <span class="phone-text">${company?.phoneDisplay || "+966 55 229 3398"}</span>
            </div>
            <div class="page-number">وثيقة رسمية معتمدة • صفحة 1 من 1</div>
          </div>

          <!-- Right: Verification QR Code -->
          <div class="footer-qr">
            <img src="${qrDataUri}" alt="QR" class="qr-img" />
          </div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}
