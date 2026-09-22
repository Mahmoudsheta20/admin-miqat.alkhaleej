import fs from "fs";
import path from "path";

/**
 * Server-Side HTML Generator for the 3-Page Official Contract Document
 * Inlines all assets (base64 PNGs, SVGs, Google Fonts) for 100% reliable offline headless PDF rendering.
 * Matches the official layout structure of Saudi transport contract documents.
 * High-contrast dark gray lines & borders, perfect vertical rhythm, Tajawal + Zain typography.
 */
export function generateContractHtml(data) {
  const { company, contract, driver, passengers, inspection, options } = data;

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
  // Use high quality transparent company seal
  const sealDataUri = fs.existsSync(path.join(process.cwd(), "public", "company-seal.png"))
    ? getPublicFileDataUri("company-seal.png", "image/png")
    : getPublicFileDataUri("WhatsApp Image 2026-09-10 at 15.56.15.jpeg", "image/jpeg");
  const getMimeType = (filePath) => {
    const lower = (filePath || "").toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    return "image/jpeg";
  };

  const driverPhotoPath = driver?.photoUrl || "taxi-driver.png";
  const driverPhotoDataUri = driverPhotoPath.startsWith("data:")
    ? driverPhotoPath
    : getPublicFileDataUri(driverPhotoPath, getMimeType(driverPhotoPath));
  const whatsappDataUri = getPublicFileDataUri("whatsapp.png", "image/png");
  const qrDataUri = contract?.qrCodeDataUri || getPublicFileDataUri("contract-qr.png", "image/png");

  // Prepare passengers for Page 2 manifest table
  const rawPassengers = (passengers || []).filter((p) => p.name && p.name.trim().length > 0);
  const passengerCount = contract?.passengerCount || (rawPassengers.length > 0 ? rawPassengers.length : 1);

  // Use only the actual passengers for the manifest rows
  const manifestRows = [...rawPassengers];

  // Chunk manifest rows into pages (max 20 rows per page to fit on A4)
  const rowsPerPage = 20;
  const manifestPages = [];
  for (let i = 0; i < manifestRows.length; i += rowsPerPage) {
    manifestPages.push(manifestRows.slice(i, i + rowsPerPage));
  }

  // Total pages: Page 1 + Passenger Manifest Pages + Page 3 (Inspection)
  const totalPages = 1 + (manifestPages.length > 0 ? manifestPages.length : 1) + 1;

  // Parse and normalize vehicle plate so Arabic letters are distinct, never cursive-joined, and use proper Arabic typography
  function parseVehiclePlate(raw) {
    if (!raw) return { letters: "ا ص ل", numbers: "7223", formatted: "ا ص ل 7223" };
    const str = String(raw).trim();
    const numMatch = str.match(/[0-9]+/g);
    const numbers = numMatch ? numMatch.join("") : "";

    let s = str.replace(/[0-9]+/g, "").trim();
    s = s.replace(/هـ/g, "__HEH_TATWEEL__");
    s = s.replace(/[ـ]/g, "");
    const parts = s.split(/\s+/).filter(Boolean);

    const lettersArr = [];
    for (const part of parts) {
      if (part === "__HEH_TATWEEL__") {
        lettersArr.push("هـ");
      } else {
        for (const char of part) {
          lettersArr.push(char);
        }
      }
    }
    const letters = lettersArr.join(" ") || "ا ص ل";
    return {
      letters,
      numbers: numbers || "7223",
      formatted: `${letters} ${numbers || ""}`.trim()
    };
  }

  const { formatted: formattedDriverPlate } = parseVehiclePlate(driver?.plateNumber);

  // Default checklist items
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

  // Cross-device resilient vector icons for inspection checklist
  const SVG_CHECK = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const SVG_CROSS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  // Common Header Template
  const headerHtml = `
    <div class="header-container" dir="rtl">
      <div class="header-grid">
        <!-- Right Column: Company Info -->
        <div class="header-right">
          <div class="company-name">${company.nameAr || "شركة ميقات الخليج للنقل البري"}</div>
          <div class="company-sub">سجل تجاري: <span class="font-mono" dir="ltr">${company.crNumber || company.unifiedNumber || "7054842252"}</span></div>
          <div class="company-sub">${company.cityAr || "المملكة العربية السعودية - مكة المكرمة"}</div>
        </div>

        <!-- Center Column: Company Logo -->
        <div class="header-center">
          <img src="${logoDataUri}" alt="ميقات الخليج" class="header-logo" />
        </div>

        <!-- Left Column: Operation & Reference Meta -->
        <div class="header-left">
          <div class="meta-row">
            <span class="meta-label">نوع التشغيل:</span>
            <span class="meta-val">${contract.operationType || "استقبال"}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">رقم المرجع:</span>
            <span class="meta-val font-mono meta-ref-num">${contract.referenceNumber || "40169"}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">تاريخ الإصدار:</span>
            <span class="meta-val font-mono" dir="ltr">${contract.issueDate || contract.date || "08/09/2026"}</span>
          </div>
        </div>
      </div>
      <div class="header-divider"></div>
    </div>
  `;

  // Common Footer Template (dir="ltr" ensures: Left = Stamp, Center = WhatsApp & Page#, Right = QR)
  const getFooterHtml = (pageNumber, totalPagesCount) => `
    <div class="footer-divider-line"></div>
    <div class="footer-container" dir="ltr">
      <div class="footer-content">
        <!-- Left: Stamp -->
        <div class="footer-stamp">
          ${options?.showStamp !== false ? `<img src="${sealDataUri}" alt="ختم الشركة" class="stamp-img" />` : ''}
        </div>

        <!-- Center: WhatsApp + Page Number -->
        <div class="footer-center">
          <div class="whatsapp-row">
            <img src="${whatsappDataUri}" alt="WhatsApp" class="whatsapp-icon" />
            <span class="phone-text">${company.phoneDisplay || "+966 55 229 3398"}</span>
          </div>
          <div class="page-number">${pageNumber} / ${totalPagesCount}</div>
        </div>

        <!-- Right: QR Code -->
        <div class="footer-qr">
          <img src="${qrDataUri}" alt="QR" class="qr-img" />
        </div>
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>عقد نقل بري رسمي - ميقات الخليج</title>
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
    .contract-page {
      width: 210mm;
      height: 297mm;
      padding: 7mm 12mm 6mm 12mm;
      margin: 0 auto;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      break-after: page;
      background: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .contract-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    /* Header Styles */
    .header-container {
      width: 100%;
      margin-bottom: 2px;
    }
    .header-grid {
      display: grid;
      grid-template-columns: 1.15fr auto 1fr;
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
      font-size: 13px;
      font-weight: 800;
      color: #334155;
      margin-top: 2px;
    }
    .header-center {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0 12px;
    }
    .header-logo {
      height: 56px;
      max-width: 170px;
      object-fit: contain;
    }
    .header-left {
      text-align: left;
    }
    .meta-row {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .meta-label {
      color: #334155;
      margin-left: 4px;
      font-weight: 800;
      font-size: 13px;
    }
    .meta-val {
      color: #090e17;
      font-weight: 900;
      font-size: 13.5px;
    }
    .meta-ref-num {
      color: #b45309 !important;
      font-weight: 900 !important;
      font-size: 14.5px !important;
    }
    .header-divider {
      width: 100%;
      height: 2.5px;
      background: linear-gradient(90deg, #d97706 0%, #f59e0b 50%, #d97706 100%);
      margin-top: 4px;
      border-radius: 2px;
    }

    /* Main Page Titles */
    .page-title {
      text-align: center;
      font-size: 24px;
      font-weight: 900;
      color: #090e17;
      margin: 8px 0 10px 0;
      letter-spacing: -0.2px;
    }
    .page-subtitle-banner {
      background-color: #e2e8f0;
      border: 1.5px solid #64748b;
      color: #090e17;
      font-size: 14.5px;
      font-weight: 900;
      text-align: center;
      padding: 6px 0;
      border-radius: 5px;
      margin-bottom: 8px;
    }

    /* Page 1: Side by Side Two Column Layout */
    .page1-grid {
      display: flex;
      gap: 12px;
      align-items: stretch;
      margin-bottom: 8px;
    }

    /* Driver Card (Right Column) */
    .driver-card {
      width: 32%;
      border: 1.5px solid #64748b;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #ffffff;
    }
    .card-banner {
      background-color: #e2e8f0;
      border-bottom: 1.5px solid #64748b;
      color: #090e17;
      font-size: 14.5px;
      font-weight: 900;
      text-align: center;
      padding: 5.5px 0;
    }
    .driver-photo-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 6px;
      background: #ffffff;
    }
    .driver-photo {
      width: 98px;
      height: 106px;
      object-fit: cover;
      border-radius: 4px;
      border: 1.5px solid #94a3b8;
    }
    .driver-field-label {
      background-color: #e2e8f0;
      border-top: 1px solid #94a3b8;
      border-bottom: 1px solid #94a3b8;
      color: #1e293b;
      font-size: 12.5px;
      font-weight: 800;
      text-align: center;
      padding: 3px 0;
    }
    .driver-field-val {
      color: #090e17;
      font-size: 14.5px;
      font-weight: 900;
      text-align: center;
      padding: 4px 0;
      background: #ffffff;
    }
    .font-mono {
      font-family: 'Outfit', 'Tajawal', 'Zain', monospace, sans-serif;
      letter-spacing: 0.5px;
      font-weight: 800;
    }
    .plate-badge {
      font-family: 'Outfit', 'Tajawal', 'Zain', sans-serif !important;
      font-weight: 900;
      letter-spacing: 0.5px;
      direction: rtl;
      unicode-bidi: isolate;
      display: inline-block;
    }

    /* Trip & Passenger Left Column */
    .trip-card-container {
      width: 68%;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .trip-card {
      border: 1.5px solid #64748b;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
    }

    /* Clean Trip Table */
    .trip-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
    }
    .trip-table th {
      background-color: #e2e8f0;
      color: #090e17;
      font-size: 14px;
      font-weight: 900;
      padding: 6.5px 6px;
      border: 1px solid #94a3b8;
    }
    .trip-table td {
      background-color: #ffffff;
      color: #090e17;
      font-size: 14.5px;
      font-weight: 800;
      padding: 7px 6px;
      border: 1px solid #94a3b8;
      vertical-align: middle;
    }
    .flight-info-row {
      display: flex;
      border-top: 1.5px solid #64748b;
      background: #f1f5f9;
    }
    .flight-info-cell {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 6px 8px;
      font-size: 13.5px;
    }
    .flight-info-cell:first-child {
      border-left: 1.5px solid #64748b;
    }
    .pill-label {
      background-color: #cbd5e1;
      color: #090e17;
      font-weight: 900;
      padding: 2.5px 9px;
      border-radius: 4px;
      font-size: 12.5px;
    }

    /* Contract Text Clauses */
    .clauses-container {
      margin-top: 8px;
      font-size: 12.5px;
      line-height: 1.75;
      color: #090e17;
      text-align: justify;
    }
    .clause-preamble {
      margin-bottom: 6px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.75;
      font-size: 12.5px;
    }
    .contract-parties {
      margin: 6px 0 8px 0;
      font-size: 13.5px;
      font-weight: 800;
      line-height: 1.7;
      background: #f1f5f9;
      padding: 7px 12px;
      border-radius: 6px;
      border: 1.5px solid #64748b;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .party-label {
      color: #1e293b;
      font-weight: 800;
      margin-left: 4px;
    }
    .party-value {
      color: #090e17;
      font-weight: 900;
    }
    .clause-item {
      margin-bottom: 4px;
      font-size: 12.5px;
      color: #090e17;
      line-height: 1.7;
      font-weight: 500;
    }

    /* Page 2: Passenger Manifest Table */
    .manifest-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      border: 1.5px solid #64748b;
      margin-bottom: 6px;
    }
    .manifest-table th {
      background-color: #e2e8f0;
      color: #090e17;
      font-size: 14.5px;
      font-weight: 900;
      padding: 7.5px 6px;
      border: 1.5px solid #64748b;
    }
    .manifest-table td {
      font-size: 14px;
      font-weight: 700;
      padding: 6px 6px;
      border: 1px solid #94a3b8;
      height: 30px;
      color: #090e17;
      vertical-align: middle;
    }
    .manifest-table tr:nth-child(even) td {
      background-color: #f1f5f9;
    }

    /* Page 3: Inspection Specifics */
    .inspection-meta-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 18px;
      margin-bottom: 6px;
      padding: 5px 12px;
      background: #f1f5f9;
      border: 1.5px solid #64748b;
      border-radius: 5px;
      font-size: 13px;
    }
    .insp-meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .insp-label {
      font-weight: 800;
      color: #1e293b;
      min-width: 90px;
      font-size: 12.5px;
    }
    .insp-val {
      font-weight: 900;
      color: #090e17;
      font-size: 13.5px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 900;
      color: #090e17;
      margin: 5px 0 2px 0;
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
      padding: 3px 4px;
      line-height: 1.2;
      border: 1.5px solid #64748b;
    }
    .insp-table td {
      font-size: 12px;
      font-weight: 700;
      padding: 1.5px 4px;
      line-height: 1.2;
      border: 1px solid #94a3b8;
      height: 22px;
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

    /* Page 3 Declaration & Bottom Seal */
    .page3-declaration-section {
      margin-top: 5px;
      text-align: center;
      padding: 6px 12px 2px 12px;
      background: #f1f5f9;
      border: 1.5px solid #64748b;
      border-radius: 5px;
    }
    .declaration-title {
      font-size: 14px;
      font-weight: 900;
      color: #090e17;
      margin-bottom: 2px;
    }
    .declaration-text {
      font-size: 12px;
      font-weight: 600;
      color: #090e17;
      margin: 0 0 4px 0;
      line-height: 1.45;
    }
    .page3-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 8px;
    }
    .page3-driver-info {
      font-size: 14px;
      font-weight: 900;
      color: #090e17;
      text-align: right;
    }
    .page3-seal-container {
      width: 80px;
      height: 80px;
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    .page3-seal-container .stamp-img {
      width: 75px;
      height: 75px;
      object-fit: contain;
      transform: rotate(-3deg);
    }
    .page3-page-num {
      text-align: center;
      font-size: 12px;
      font-weight: 800;
      color: #475569;
      font-family: 'Outfit', sans-serif;
      margin-top: 2px;
    }

    /* Footer Styles */
    .footer-divider-line {
      width: 100%;
      height: 1.5px;
      background: linear-gradient(90deg, #94a3b8 0%, #475569 50%, #94a3b8 100%);
      margin-bottom: 4px;
    }
    .footer-container {
      width: 100%;
      margin-top: 0;
      padding-top: 2px;
      box-sizing: border-box;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .footer-stamp {
      width: 110px;
      flex-shrink: 0;
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    .stamp-img {
      width: 92px;
      height: 92px;
      object-fit: contain;
      transform: rotate(-3deg);
    }
    .footer-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    .whatsapp-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }
    .whatsapp-icon {
      width: 22px;
      height: 22px;
      object-fit: contain;
    }
    .phone-text {
      font-size: 15px;
      font-weight: 900;
      color: #090e17;
      font-family: 'Outfit', sans-serif;
      letter-spacing: 0.5px;
    }
    .page-number {
      font-size: 13px;
      font-weight: 800;
      color: #475569;
      font-family: 'Outfit', sans-serif;
    }
    .footer-qr {
      width: 110px;
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
    .qr-img {
      width: 78px;
      height: 78px;
      max-width: 78px;
      max-height: 78px;
      object-fit: contain;
    }
  </style>
</head>
<body>

  <!-- ════════════════ PAGE 1: TRANSPORT CONTRACT ════════════════ -->
  <div class="contract-page">
    <div>
      ${headerHtml}

      <div class="page-title">إبرام عقد بين الطرفين</div>

      <!-- Side-by-Side Grid: Driver on Right, Trip/Passenger on Left -->
      <div class="page1-grid">
        <!-- Right Column: Driver Info -->
        <div class="driver-card">
          <div class="card-banner">معلومات السائق</div>
          <div class="driver-photo-container">
            <img src="${driverPhotoDataUri}" alt="صورة السائق" class="driver-photo" />
          </div>
          <div class="driver-field-label">${driver.role || "السائق الأساسي"}</div>
          <div class="driver-field-val">${driver.name || "علي أحمد غلام أحمد"}</div>
          <div class="driver-field-label">رقم الهوية</div>
          <div class="driver-field-val font-mono" dir="ltr">${driver.nationalId || "2553660073"}</div>
          <div class="driver-field-label">رقم الجوال</div>
          <div class="driver-field-val font-mono" dir="ltr">${driver.mobile || "0542273515"}</div>
          <div class="driver-field-label">رقم اللوحة</div>
          <div class="driver-field-val font-mono plate-badge" style="color: #b45309;">${formattedDriverPlate}</div>
        </div>

        <!-- Left Column: Trip Info + Passenger Summary -->
        <div class="trip-card-container">
          <!-- Trip Card -->
          <div class="trip-card">
            <div class="card-banner">معلومات الرحلة والمسار</div>
            <table class="trip-table">
              <thead>
                <tr>
                  <th style="width: 38%;">من</th>
                  <th style="width: 38%;">إلى</th>
                  <th style="width: 24%;">تاريخ ووقت الوصول</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 800;">${contract.origin || "مطار الملك عبدالعزيز الدولي - جدة"}</td>
                  <td style="font-weight: 800;">${contract.destination || "مكة المكرمة سويس المقام"}</td>
                  <td>
                    <div class="font-mono" dir="ltr" style="font-weight: 800;">${contract.date || "2026-09-08"}</div>
                    <div style="margin-top: 2px; font-weight: 800;" class="font-mono" dir="ltr">${contract.time || "22:01"}</div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="flight-info-row">
              <div class="flight-info-cell">
                <span class="pill-label">الخطوط الناقلة</span>
                <span style="font-weight: 800; color: #090e17;">${contract.flightCarrier || "الخطوط السعودية"}</span>
              </div>
              <div class="flight-info-cell">
                <span class="pill-label">رقم الرحلة</span>
                <span style="font-weight: 800; color: #090e17;" class="font-mono" dir="ltr">${contract.tripNumber || "SV841"}</span>
              </div>
            </div>
          </div>

          <!-- Passenger Summary Card -->
          <div class="trip-card">
            <div class="card-banner">معلومات الركاب والعميل</div>
            <table class="trip-table">
              <thead>
                <tr>
                  <th style="width: 70%;">اسم الضيف الأساسي</th>
                  <th style="width: 30%;">عدد الركاب</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 900; color: #090e17;">${contract.secondParty || "ماجد"}</td>
                  <td style="font-weight: 900; color: #b45309;" class="font-mono">${passengerCount}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Contract Text & Clauses -->
      <div class="clauses-container">
        <div class="clause-preamble">
          ${contract.preamble || "تم إبرام هذا العقد بين المتعاقدين بناءً على المادة (39) التاسعة والثلاثين من اللائحة المنظمة لنشاط النقل المتخصص وتأجير وتوجيه الحافلات، وبناءً على الفقرة (1) من المادة (39) التي تنص على أنه يجب على الناقل إبرام عقد نقل مع الأطراف المحددين في المادة (40) قبل تنفيذ عمليات النقل على الطرق البرية، وبما لا يخالف أحكام هذه اللائحة ووفقاً للضوابط التي تحددها هيئة النقل.\nوبناءً على ما سبق، تم إبرام عقد النقل بين الأطراف الآتية:"}
        </div>

        <div class="contract-parties">
          <div><span class="party-label">الطرف الأول (الناقل):</span> <span class="party-value">${contract.firstParty || `${company.nameAr || "شركة ميقات الخليج للنقل البري"} - ترخيص رقم: ${company.licenseNumber || "35/00009318"}`}</span></div>
          <div><span class="party-label">الطرف الثاني (العميل):</span> <span class="party-value">${contract.secondParty || "ماجد"}</span></div>
        </div>

        <div class="clause-item">
          • ${contract.agreementClause || "اتفق الطرفان على أن ينفذ الطرف الأول عملية النقل للطرف الثاني مع مرافقيه وذويهم من الموقع المحدد مسبقاً مع الطرف الثاني وتوصيلهم إلى الوجهة المحددة في العقد."}
        </div>
        <div class="clause-item">
          • ${contract.cancellationPolicy || "في حال إلغاء التعاقد لأي سبب شخصي أو أسباب أخرى تتعلق في الحجوزات أو الأنظمة تكون سياسة الإلغاء والاستبدال حسب نظام وزارة التجارة السعودية. في حالة الحجز وتم الإلغاء قبل موعد الرحلة بأكثر من 24 ساعة يتم استرداد المبلغ كامل."}
        </div>
        <div class="clause-item">
          • ${contract.electronicBookingClause || "في حال طلب الطرف الثاني الحجز من خلال الموقع الإلكتروني للمؤسسة، يعتبر هذا الحجز وموافقته على الشروط والأحكام بالموقع الإلكتروني هو موافقة على هذا العقد لتنفيذ عملية النقل المتفق عليها مع الطرف الأول بواسطة حافلات المؤسسة المرخصة والمتوافقة مع الاشتراطات المقررة من هيئة النقل."}
        </div>
      </div>
    </div>

    <!-- Footer -->
    ${getFooterHtml(1, totalPages)}
  </div>

  <!-- ════════════════ PAGE 2...N: PASSENGER MANIFEST ════════════════ -->
  ${manifestPages.map((pageRows, pageIndex) => `
  <div class="contract-page">
    <div>
      ${headerHtml}

      <div class="page-title">كشف الركاب والمرافقين</div>
      <div class="page-subtitle-banner">بيان تفصيلي بأسماء الركاب المصرح لهم بالرحلة${manifestPages.length > 1 ? ` (صفحة ${pageIndex + 1} من ${manifestPages.length})` : ''} - إجمالي الركاب: ${passengerCount}</div>

      <table class="manifest-table">
        <thead>
          <tr>
            <th style="width: 8%;">م</th>
            <th style="width: 44%;">اسم الضيف / الراكب</th>
            <th style="width: 24%;">الجنسية</th>
            <th style="width: 24%;">رقم الهوية / الجواز</th>
          </tr>
        </thead>
        <tbody>
          ${pageRows.map((p, idx) => {
            const rowNumber = pageIndex * rowsPerPage + idx + 1;
            return `
            <tr>
              <td class="font-mono">${rowNumber}</td>
              <td style="font-weight: 800; text-align: right; padding-right: 12px;">${p.name || ""}</td>
              <td>${p.nationality || ""}</td>
              <td class="font-mono" dir="ltr">${p.idNumber || ""}</td>
            </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    ${getFooterHtml(2 + pageIndex, totalPages)}
  </div>
  `).join("")}

  <!-- ════════════════ PAGE LAST: VEHICLE INSPECTION ════════════════ -->
  <div class="contract-page">
    <div>
      ${headerHtml}

      <div class="page-title" style="font-size: 23px; margin: 6px 0 8px 0;">سجل الفحص التشغيلي اليومي للمركبة</div>

      <!-- Vehicle & Inspection Metadata -->
      <div class="inspection-meta-list">
        <div class="insp-meta-row">
          <span class="insp-label">اسم الشركة:</span>
          <span class="insp-val">${company.nameAr || "شركة ميقات الخليج للنقل البري"}</span>
        </div>
        <div class="insp-meta-row">
          <span class="insp-label">لوحة المركبة:</span>
          <span class="insp-val font-mono plate-badge" style="color: #b45309;">${formattedDriverPlate}</span>
        </div>
        <div class="insp-meta-row">
          <span class="insp-label">اسم السائق:</span>
          <span class="insp-val">${driver.name || "علي أحمد غلام أحمد"}</span>
        </div>
        <div class="insp-meta-row">
          <span class="insp-label">تاريخ الفحص:</span>
          <span class="insp-val font-mono" dir="ltr">${inspection.date || "08/09/2026"}</span>
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
          ${inspection.declarationText || "أقر أنا السائق المعتمد أعلاه بأنني قمت بإجراء الفحص الفني والتشغيلي الشامل للمركبة والتأكد التام من جاهزيتها وسلامتها التشغيلية ومطابقتها لاشتراطات السلامة المقررة من الهيئة العامة للنقل قبل بدء التشغيل."}
        </p>

        <div class="page3-bottom-row">
          <!-- Driver Info at right -->
          <div class="page3-driver-info">
            <span>اسم السائق المعتمد:</span>
            <span style="margin-right: 6px; color: #b45309;">${driver.name || "علي أحمد غلام أحمد"}</span>
          </div>

          <!-- Stamp at bottom left -->
          <div class="page3-seal-container">
            ${options?.showStamp !== false ? `<img src="${sealDataUri}" alt="ختم الشركة" class="stamp-img" />` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Page 3 footer number -->
    <div class="page3-page-num" dir="ltr">${totalPages} / ${totalPages}</div>
  </div>

</body>
</html>
  `;
}
