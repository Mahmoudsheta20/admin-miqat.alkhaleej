# Whole-system refactor — implementation and verification

## Compatibility and architecture

The application retains its 37 page routes, `ADMIN` / `CAPTAIN` roles, Express business APIs, Prisma schema, record identifiers, financial calculations, document numbering and historical PDFs. No database migration, seed, or live business mutation was run for this work.

The navigation is one role-filtered registry: Overview, Operations, People, Finance and Settings. Captain navigation has Home, Inspection, Contracts and Account. Create actions live within their sections. Company/bank settings remain at their existing route; `/admin/zatca/new` remains a compatible invoice-creation wrapper. `/admin/zatca` now explains integration status and links to the shared invoice flow instead of maintaining a second invoice list.

The browser calls the existing same-origin proxy in every environment, including protected document navigation. Express sets HttpOnly cookies; browser storage no longer contains tokens or identity profiles. Credential URLs have been removed. Deploy the frontend and backend changes together. Legacy browser-token-only sessions must sign in again.

## Shared implementation

- Navigation registry, responsive shell, breadcrumbs, titles and four-item captain navigation.
- Bundled IBM Plex Sans Arabic / Inter with licenses, token-based light/dark themes, larger field labels, calmer surfaces and clearer tables.
- Shared page headers, filtering controls, searchable native disclosures, authentication shell, document preview and native payment dialog.
- Shared contract guest/journey/issue-date fields, payload sanitization, passenger management and inspection definitions/checklist.
- Keyed session-scoped reads, stale-result protection, mutation invalidation and URL-backed filters/report periods. Related financial entities remain distinct.
- Existing exact decimal helpers and invoice/document distinctions remain authoritative. No rewriting of financial history.

## Defects resolved

| Finding | Fix and verification |
|---|---|
| Login returned a browser-readable JWT despite cookie-only regression expectations | Authentication JSON no longer exposes session tokens; existing security regression and browser session tests pass. |
| Untrusted-origin mutations were allowed in test/development mode | Strict CORS allowlisting and mutation-origin enforcement now agree in every environment. |
| PDF previews carried session tokens in query strings | Shared cookie-authenticated proxy previews and downloads; query-token authentication removed. |
| Old inspection could appear as current captain readiness | Saudi-day and vehicle matching applied to home and contract eligibility; historical inspection regression added. |
| Previously signed-in user could leave cached in-flight data | Session-scoped cache keys and invalidation prevent late responses from caching under another user. |
| Invoice transport view could crash when the passenger list was missing | Missing historical passenger arrays render safely. |
| Payment entry tolerated one halala above the outstanding balance | Exact minor-unit comparison and native maximum reject excess payments. |
| Repeated payment/mutation submissions before rerender | Synchronous in-flight guards complement server idempotency. |
| Several interactive assignment controls were clickable divs | Shared native disclosures, search fields and buttons support keyboard selection. |
| Currency captions failed contrast checks | Caption colours use the semantic muted-text token. |
| Failed logout could appear successful while the cookie remained valid | Failed sign-out retains the session and exposes a recoverable error. |
| Dependency advisories | Next.js 16.4.5, Zod 4.6.7 and compatible dependency updates; targeted ESLint minimatch override. Both npm audits report zero vulnerabilities. |

## Verification boundaries

Frontend unit tests cover money, dates, invoices, localization, cache isolation, navigation and inspection readiness. Playwright uses a separate fixture HTTP backend on 5109 and UI on 3419: it exercises the real frontend and proxy/cookies without a database. The backend regression suite mocks persistence while exercising API authorization, validation and financial/document helpers. Browser checks cover all37 routes in Arabic/English and light/dark, with representative 390/768/1440px captures, keyboard operation and axe checks on the dashboard/login.

Nine real document samples were rendered in Chrome with external requests disabled and confirmed to load the bundled Arabic font: the three-page contract, one-page inspection, proforma, and six standard/simplified tax invoice/credit/debit variants. Poppler renders were inspected for shaping and layout. The independent financial and QR regressions remain passing.

Fixtures and unit tests do not verify live database CRUD, SMTP delivery, S3 permissions or external ZATCA submission. Those integrations require a configured isolated deployment; they were not exercised against production. No claim of eliminating every possible future defect is implied by these bounded checks.

## Verification result — 2026-11-08

| Check | Result |
|---|---|
| Frontend unit regressions | 54 passed |
| Backend regressions | 93 passed |
| Playwright workflows | 18 passed |
| Representative language/theme/viewport captures | 48 valid captures; fresh-page geometry verified |
| Frontend lint and both TypeScript checks | Passed |
| Frontend production build and backend build | Passed |
| Dependency audits | Zero reported vulnerabilities in both projects |
| Actual PDF layout samples | Nine rendered offline and inspected |
| Independent design review | Contrast and persistence fixes scored resolved; ship at the reviewed fix-list scope |

## Route inventory

Every route below is exercised in the language/theme browser matrix; root redirect and authentication have dedicated checks.

| Route | Audience |
|---|---|
| `/admin/accounting` | Admin |
| `/admin/accounts` | Admin |
| `/admin/admins` | Admin |
| `/admin/captains/[id]/account` | Admin |
| `/admin/captains` | Admin |
| `/admin/contracts/[id]/edit` | Admin |
| `/admin/contracts/[id]` | Admin |
| `/admin/contracts/new` | Admin |
| `/admin/contracts` | Admin |
| `/admin/customers/[id]` | Admin |
| `/admin/customers` | Admin |
| `/admin/fleet` | Admin |
| `/admin/inspections` | Admin |
| `/admin/invoices/[id]` | Admin |
| `/admin/invoices/new` | Admin |
| `/admin/invoices` | Admin |
| `/admin/invoices/settings` | Admin |
| `/admin` | Admin |
| `/admin/purchases` | Admin |
| `/admin/representatives` | Admin |
| `/admin/staff/[id]` | Admin |
| `/admin/staff` | Admin |
| `/admin/vat-returns` | Admin |
| `/admin/vat-returns/selected` | Admin |
| `/admin/zatca/new` | Admin |
| `/admin/zatca` | Admin |
| `/captain/account` | Captain |
| `/captain/contract` | Captain |
| `/captain/inspection` | Captain |
| `/captain` | Captain |
| `/forgot-password` | Public / authentication |
| `/login` | Public / authentication |
| `/` | Public / authentication |
| `/reset-password` | Public / authentication |
| `/verify/contract/[ref]` | Public / authentication |
| `/verify/inspection/[id]` | Public / authentication |
| `/verify/invoice/[id]` | Public / authentication |
