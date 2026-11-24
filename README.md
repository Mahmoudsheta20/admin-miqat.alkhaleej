# Miqat Operations (`admin-miqat.alkhaleej`)

Arabic-first fleet operations, transport contract, captain, customer, and financial accounting workspace for **Miqat Al Khaleej Land Transport**. This repository contains the Next.js 16 / React 19 frontend; the sibling `backend-miqat.alkhaleej` repository houses the Express / Prisma backend responsible for authentication, authorization, persistence, PDF generation, storage, and email.

## Core Modules & Features

The application exposes **39 App Router page routes** organized by role and operational area:

### Admin Workspace (`/admin`)
- **Overview** (`/admin`): Executive KPIs, action center, fleet readiness, and operational/financial analytics.
- **Operations**:
  - **Contracts** (`/admin/contracts`, `/new`, `/[id]`, `/[id]/edit`): Transport contract creation and editing, passenger manifests, reverse/return trips, PDF previews, and WhatsApp dispatch.
  - **Vehicle Inspections** (`/admin/inspections`): 16-point daily inspection workflow (dashboard warnings, exterior checks, and safety equipment) matched against the Saudi business day (`Asia/Riyadh`) and vehicle plate.
  - **Fleet** (`/admin/fleet`): Vehicle registry, plate management, and document expiry tracking.
  - **Captains** (`/admin/captains`, `/[id]/account`): Driver profiles, credentials, and individual financial subledgers.
- **People**:
  - **Customers** (`/admin/customers`, `/[id]`): Customer directory and receivables ledger.
  - **Staff Accounts & Representatives** (`/admin/staff`, `/[id]`, `/admin/representatives`): Salaries, advances, trip allowances (تريبات), and payroll approvals.
- **Finance**:
  - **Invoices** (`/admin/invoices`, `/new`, `/[id]`): Tax, simplified, proforma, and booking invoices (one-way, round-trip, hourly, multi-stop, and custom), credit/debit notes, exact minor-unit calculations, payment recording, and PDF/XML/QR downloads.
  - **Purchases & Expenses** (`/admin/purchases`): Supplier bills across 9 fleet/operating expense categories, recoverable VAT tracking, and voiding.
  - **Accounting & Chart of Accounts** (`/admin/accounting`, `/admin/accounts`): Double-entry journal entries, account ledgers, income statement (P&L), trial balance, vehicle profitability, and period controls.
  - **Financial Exports Center** (`/admin/accounting/exports`): CSV, PDF, and JSON exports across 9 financial sections with audit/reporting presets (`COMPLETE_AUDIT`, `ZATCA_VAT_PACK`, `CASH_RECEIVABLES`, `MANAGEMENT_PNL`).
  - **VAT Returns** (`/admin/vat-returns`, `/selected`): Quarterly Saudi VAT return boxes (1–16), prior-period adjustments, and manual invoice/purchase selection.
- **Settings & Integrations**:
  - **Company & Bank** (`/admin/invoices/settings`): Commercial registration, VAT number, and invoice bank defaults.
  - **ZATCA E-Invoicing** (`/admin/zatca`, `/new`): EGS units, CSID certificate status, compliance checks, and Sandbox/Simulation/Production status.
  - **WhatsApp Integration** (`/admin/whatsapp`): QR session pairing/recovery, anti-ban rate-limit/queue controls, automated driver trip polls/workflow rules, and document dispatch (contracts, invoices, inspections).
  - **Administrators** (`/admin/admins`, Super Admin only): Admin account management and granular module RBAC across 15 modules (`view`, `write`, `delete`, `approve`) with presets (`Full Admin`, `Accounting & Invoices`, `Operations & Fleet`, `Read-Only`).

### Captain Workspace (`/captain`)
Focused four-destination workspace for drivers:
- **Home** (`/captain`)
- **Daily Inspection** (`/captain/inspection`)
- **Contracts** (`/captain/contract`)
- **Account** (`/captain/account`)

### Authentication & Public Verification
- **Authentication**: `/`, `/login`, `/forgot-password`, `/reset-password`
- **Public Verification**: `/verify/contract/[ref]`, `/verify/inspection/[id]`, `/verify/invoice/[id]` for external verification of issued documents by reference/QR code.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js `16.4.5` (App Router), React `19.2.8` |
| Language | TypeScript `5` (`strict: true`) |
| Styling & UI | Tailwind CSS `4`, CSS custom properties (`app/globals.css`), `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| Forms & Validation | `react-hook-form` `7`, `zod` `4`, `@hookform/resolvers`, `libphonenumber-js` |
| Typography | Locally bundled `IBM Plex Sans Arabic` (Arabic) and `Inter` (Latin), weights `400/500/600/700` (`app/fonts/`) |
| Testing & Linting | Node built-in test runner (`node --test`), Playwright (`@playwright/test`), `@axe-core/playwright`, ESLint `9` (`eslint-config-next`) |

## Prerequisites & Local Setup

- **Node.js**: `22.12+` (`Node 24` recommended)
- **Backend**: Running instance of the sibling `backend-miqat.alkhaleej` Express/Prisma service

1. Install dependencies:
   ```sh
   npm ci
   ```
2. Create `.env.local` from `.env.example` and point `BACKEND_URL` at your local backend:
   ```sh
   cp .env.example .env.local
   ```
   Ensure `.env.local` sets `BACKEND_URL=http://localhost:5001` (or your backend origin).
3. Start the backend with its documented configuration, setting the backend's `FRONTEND_URL` to the exact frontend origin including its port (for example, `http://localhost:3000`). Use one hostname consistently (`localhost` vs `127.0.0.1`) so HttpOnly session cookies match.
4. Start the development server:
   ```sh
   npm run dev
   ```

## Environment Variables

Database, SMTP, JWT, object storage, and service-role secrets belong **only** in the backend environment.

| Variable | Default / Example | Purpose |
|---|---|---|
| `BACKEND_URL` | `http://localhost:5001` | Server-side Express backend origin used by Next.js `/api/proxy/:path*` rewrites (resolved at build time) and server-side requests. |
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:5001` | Compatibility fallback when `BACKEND_URL` is unset; browser requests still use `/api/proxy/` rather than sending credentials directly here. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Declared in `.env.example` for frontend origin configuration. |
| `NEXT_PUBLIC_ENABLE_DEMO_DATA` | `false` | Enables development-only test-data seeding controls when set to `true`. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | macOS Google Chrome path | Overrides the Chrome/Chromium binary path used by Playwright E2E tests on non-macOS systems. |
| `MIQAT_E2E` | unset (`1` in E2E) | Switches Next's `distDir` from `.next` to `.next-e2e` during Playwright runs (`next.config.ts`). |

## Architecture

- **Single navigation registry**: `lib/navigation.ts` drives Overview, Operations, People, Finance, Settings, and the four captain destinations (desktop/mobile navigation, breadcrumbs, and route titles). Existing browser URLs and query parameters remain compatibility contracts.
- **Same-origin API & document proxy**: Every browser API request, protected document preview, and download goes through the same-origin `/api/proxy/:path*` rewrite (`next.config.ts`, `proxyTimeout: 150_000`). Server-side calls resolve `BACKEND_URL` directly (`lib/backend.ts`).
- **Cookie-only authentication & RBAC**: Authentication uses backend-issued HttpOnly cookies (`credentials: "include"`). Tokens are never stored in browser storage or embedded in document URLs; `clearLegacyCredentials()` retires legacy browser storage/cookie tokens during session initialization. Express enforces `ADMIN` / `CAPTAIN` roles, record ownership, and Super Admin restrictions; `lib/permissions.ts` mirrors module permissions in the UI.
- **Client-safe API adapters**: Modules under `app/_actions/` are ordinary TypeScript HTTP modules, not Next Server Actions. Express owns authorization, persistence, PDF generation, storage, and email.
- **Caching, URL state & financial accuracy**: Shared keyed queries (`lib/use-api-query.ts`, `lib/clientCache.ts`) use session-scoped caching; successful write mutations dispatch `miqat:mutation` to invalidate cached reads (read-only POST report/export routes skip invalidation). List filters and report periods are URL-backed (`lib/use-url-state.ts`, `lib/use-report-period.ts`). Exact decimal and minor-unit helpers (`lib/money.ts`, `lib/accounting.ts`, `lib/invoice-booking.ts`) remain the source of truth without rewriting historical totals, numbering, tax snapshots, or QR data.
- **Localization & theming**: Arabic (`ar`, RTL) is the default with full English (`en`, LTR) and light/dark theme support (`lib/languageContext.tsx`, `lib/themeContext.tsx`, `app/globals.css`). UI and newly generated PDFs use locally bundled IBM Plex Sans Arabic and Inter with zero external font requests; UI labels translate while customer names and stored business data remain unchanged.

## Project Structure

```text
admin-miqat.alkhaleej/
├── app/
│   ├── (admin)/admin/        # Admin routes (28 pages across Overview, Operations, People, Finance, Settings)
│   ├── (captain)/captain/    # Captain routes (4 pages: home, inspection, contract, account)
│   ├── verify/               # Public QR/reference verification pages (contract, inspection, invoice)
│   ├── login/, forgot-password/, reset-password/
│   ├── _actions/             # Client-safe typed HTTP adapter modules (not Next Server Actions)
│   ├── _components/          # Shared shell, forms, modals, pickers, commercial, contracts, documents, WhatsApp
│   ├── fonts/                # Locally bundled IBM Plex Sans Arabic & Inter woff2 files + licenses
│   └── globals.css           # Semantic light/dark design tokens and base styles
├── components/ui/            # Reusable low-level UI primitives (button, card, input, table, sidebar, etc.)
├── lib/                      # Backend client, RBAC permissions, navigation, accounting, ZATCA, WhatsApp, money, i18n
├── tests/                    # 23 Node unit/regression test files (*.test.mjs) + tests/e2e/ (5 Playwright specs + fixture server)
├── docs/                     # Refactor report, localization guide, and UX/VAT plans
├── public/                   # Brand assets (logo, company seal, badges)
├── PRODUCT.md                # Product scope, compatibility contracts, and validation boundaries
├── AGENTS.md                 # Engineering rules and coding conventions
├── DESIGN.md                 # Extracted visual tokens and typography rules
└── next.config.ts            # Same-origin /api/proxy rewrite, image remotePatterns, and E2E distDir
```

## Scripts & Verification

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Production build using Next's webpack compiler (`next build --webpack`) |
| `npm run start` | Serve the production build |
| `npm test` | Run unit and regression tests (`node --test tests/*.test.mjs`) |
| `npm run typecheck` | Run strict TypeScript type check (`tsc --noEmit`) |
| `npm run lint` | Run ESLint (`eslint`) |
| `npm run test:e2e` | Run Playwright browser tests (`playwright test`) |

Full verification sequence:

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

### E2E & Validation Boundaries
- Browser tests (`playwright.config.ts`) launch an isolated fixture HTTP backend (`tests/e2e/fixture-server.mjs`) on `127.0.0.1:5109` and a Next dev server on `127.0.0.1:3419` (`MIQAT_E2E=1`, `.next-e2e`), requiring no database credentials.
- Chrome defaults to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` on other platforms. Browser test caches and reports remain separate from application storage.
- Unit and fixture browser checks do **not** verify live database CRUD, SMTP delivery, S3 storage permissions, or external ZATCA transmission.
- Test-data seeding controls require `NEXT_PUBLIC_ENABLE_DEMO_DATA=true` in development.

## Additional Documentation

- `PRODUCT.md` — Product scope, compatibility contracts, and validation boundaries
- `AGENTS.md` — Engineering conventions, security rules, and quality requirements
- `DESIGN.md` — Extracted color tokens, typography scale, and component visual rules
- `docs/REFACTOR.md` — Whole-system refactor compatibility inventory, defect fixes, and route inventory
- `docs/LOCALIZATION.ar.md` — Arabic/English UI localization notes
- `docs/INVOICE-ACCOUNTING-UX-PLAN.ar.md` — Invoice and accounting UX plan
- `docs/VAT-RETURN-REMEDIATION-PLAN.ar.md` — VAT return remediation plan

## Deployment

- Deploy frontend and backend together.
- Configure `BACKEND_URL` **before building**, because Next.js resolves `/api/proxy/:path*` rewrites during the build.
- Serve the frontend over HTTPS to protect its HttpOnly session cookie. Keep the backend's trusted `FRONTEND_URL` origin accurate and restrict direct backend exposure as appropriate for your hosting setup.
- Keep all database, SMTP, JWT, storage, and service-role secrets exclusively in the backend environment; browser identity remains server-validated.
- A coordinated rollout is required for cookie-only authentication and document access; users holding only legacy browser tokens must sign in again.
- Existing data, database schema, numbering, and historical PDFs remain unchanged. Ignored `private-storage/legacy-public/` remains a backend backup/import concern and is not deployed with the frontend.
