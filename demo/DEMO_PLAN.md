# Miqat Al-Khaleej — Executive Product Demo Blueprint (`DEMO_PLAN.md`)

- **Target Deliverable:** `output/system-demo-sa.mp4` (`1920×1080`, 30 fps, H.264 / AAC, `-movflags +faststart`) + `output/subtitles.srt` & `output/subtitles-en.srt`
- **Target Duration:** `~87 seconds` (1m 27s — fast, crisp, zero filler)
- **Voiceover Engine:** `@elevenlabs/elevenlabs-js` (`eleven_v4`, Request Stitching across scenes)
- **Language & Audience:** Modern professional Saudi white dialect for business owners, operations managers, financial controllers, and prospective clients

---

## 1. Compact 8-Scene Executive Story Arc (`~87s` Total)

| Scene | Target | Routes / Visual | Focus & Live Interactions |
|---|---|---|---|
| `scene_01` | ~10s | Branded Miqat Intro Card (3s) → `/admin` | Branded slate into Executive Dashboard: KPI highlight frame, quick-create hover, brief dark-mode flash back to light |
| `scene_02` | ~10s | `/admin/fleet` → `/admin/inspections` | Fleet bus/VIP overview → open 16-point safety inspection detail modal & WhatsApp PDF action |
| `scene_03` | ~11s | `/admin/contracts/11111111-1111-4111-8111-111111111111` → `/captain` → `/captain/account` | Contract passenger manifest & QR link → seamless switch into isolated Captain Portal & exact halala wallet |
| `scene_04` | ~11s | `/admin/invoices` → `/admin/invoices/55555555-5555-4555-8555-555555555502` | Filter `مدفوعة جزئياً`, inspect action menu, open `TAX-000107` progress ribbon & `RecordPaymentModal` |
| `scene_05` | ~10s | `/admin/invoices/new` | Rapid 4-stage wizard: select contract auto-fill → route → enter `12500` showing 15% VAT & live sidebar → Review stage |
| `scene_06` | ~11s | `/admin/purchases` → `/admin/accounting` | New Expense modal (`شامل 15%` / `قبل الضريبة`) linked to fleet vehicle → Accounting Hub KPIs, liquidity cards & vehicle margin |
| `scene_07` | ~14s | `/admin/vat-returns` → `/admin/accounting/exports` | Boxes 1–16 ZATCA VAT summary → **Unified Financial Exports Center**: preset bundle, 19 Advanced Filters expand, Live Preview tabs, A4 PDF / Excel CSV / JSON |
| `scene_08` | ~10s | `/admin/whatsapp` → `/admin/admins` → Branded Outro Card (4s) | Connected WhatsApp flow, Super Admin granular RBAC presets, and closing Miqat executive outro card |

---

## 2. Isolated Demo Environment
- Recorded against `demo/demo-backend.mjs` (`127.0.0.1:5129`) + Next.js dev (`127.0.0.1:3429`, `MIQAT_E2E=1`), guaranteeing zero live DB mutations, rich Arabic business records, and clean console/UI states.
- Override cleanly anytime via `DEMO_URL=http://localhost:3000`.
