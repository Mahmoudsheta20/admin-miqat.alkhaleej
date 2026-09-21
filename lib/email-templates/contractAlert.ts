/**
 * Email template for Contract Creation Notification.
 * STRICT PRIVACY REQUIREMENT:
 * This template NEVER includes any contract details (no contract number, customer name,
 * dates, route, price, or creator info). It only contains the general notification and the secure review CTA link.
 */

export interface ContractAlertTemplateProps {
  reviewUrl: string;
}

export function renderContractAlertHtml({ reviewUrl }: ContractAlertTemplateProps): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="ie=edge" />
  <title>عقد جديد يحتاج إلى مراجعة | ميقات الخليج</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      direction: rtl;
      text-align: right;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f8fafc;
      padding: 40px 16px;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 32px 28px;
      text-align: center;
      border-bottom: 3px solid #d97706;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      color: #fbbf24;
      font-size: 13px;
      font-weight: 600;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .content {
      padding: 36px 32px;
      text-align: right;
    }
    .badge {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      font-size: 12px;
      font-weight: 700;
      padding: 5px 14px;
      border-radius: 9999px;
      border: 1px solid #fde68a;
      margin-bottom: 18px;
    }
    .subject-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 16px 0;
      line-height: 1.4;
    }
    .body-text {
      font-size: 15px;
      line-height: 1.8;
      color: #334155;
      margin: 0 0 28px 0;
    }
    .alert-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-right: 4px solid #d97706;
      border-radius: 8px;
      padding: 16px 18px;
      margin-bottom: 30px;
    }
    .alert-box p {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: #475569;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 20px 0;
    }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 700;
      padding: 14px 38px;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(217, 119, 6, 0.25);
      transition: all 0.2s ease;
    }
    .divider {
      border: none;
      border-top: 1px solid #f1f5f9;
      margin: 28px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0;
      line-height: 1.5;
    }
    .footer a {
      color: #d97706;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header with Miqat Al Khaleej Branding -->
      <div class="header">
        <h1 class="brand-title">شركة ميقات الخليج للنقل البري</h1>
        <p class="brand-sub">MIQAT AL KHALEEJ TRANSPORTATION</p>
      </div>

      <!-- Main Body -->
      <div class="content">
        <div class="badge">إشعار تشغيلي رسمي</div>
        <h2 class="subject-title">عقد جديد يحتاج إلى مراجعة</h2>
        <p class="body-text">
          تم إنشاء عقد جديد في نظام ميقات الخليج ويحتاج إلى المراجعة.
        </p>

        <!-- Security Note -->
        <div class="alert-box">
          <p>
            حفاظاً على سرية البيانات والخصوصية التشغيلية، لا يتضمن هذا البريد تفاصيل العقد. يُرجى الدخول إلى النظام باستخدام حسابكم الإداري المعتمد للاطلاع على كامل بيانات العقد واعتماده.
          </p>
        </div>

        <!-- Secure Action Button -->
        <div class="cta-container">
          <a href="${reviewUrl}" class="cta-btn" target="_blank" rel="noopener noreferrer">
            مراجعة العقد
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        <p>نظام إدارة الأسطول والرحلات — شركة ميقات الخليج للنقل البري</p>
        <p>بوابة النظام: <a href="https://admin.miqatalkhaleej.com/" target="_blank">admin.miqatalkhaleej.com</a> | الموقع العام: <a href="https://miqatalkhaleej.com/" target="_blank">miqatalkhaleej.com</a></p>
        <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">هذه الرسالة مرسلة تلقائياً من خادم النظام الداخلي المعتمد، يرجى عدم الرد المباشر عليها.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
