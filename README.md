# Miqat Operations

Arabic-first fleet, contract, captain, customer, and accounting workspace. Next.js 16 / React 19 frontend; Express / Prisma backend in the sibling `backend-miqat.alkhaleej` repository.

## Local setup

Use Node.js 22.12+ (Node 24 recommended). Start the backend with its documented configuration, then configure `.env.local` with `BACKEND_URL=http://localhost:5001` and run `npm ci`, `npm run dev`.

Use one hostname consistently. Set the backend's `FRONTEND_URL` to the exact frontend origin, including its port.

## Architecture

- One navigation registry drives Overview, Operations, People, Finance, Settings, and the four captain destinations. Existing routes remain valid.
- Every browser API request, protected document preview, and download goes through the same-origin `/api/proxy/` rewrite. Server-side calls resolve `BACKEND_URL` directly.
- Authentication uses backend-issued HttpOnly cookies. Tokens are never stored in browser storage or embedded in document URLs. Old browser credentials are retired during session initialization.
- API adapters under `app/_actions/` are regular modules, not Next Server Actions. Express owns authorization, persistence, PDF generation, storage, and email.
- Shared keyed queries use session-scoped caching; mutations invalidate reads. List filters are URL-backed. Exact financial calculation helpers remain the source of truth.
- UI and new PDFs use bundled IBM Plex Sans Arabic and Inter. Arabic/English, RTL/LTR, and light/dark themes are supported without external font requests.

## Verification

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

The build uses Next's supported webpack compiler. Browser tests start a separate fixture backend and Next instance, with no database credentials, on ports 5109 and 3419. Chrome defaults to the macOS app path; override `PLAYWRIGHT_CHROMIUM_EXECUTABLE` on other systems. Browser test data and reports are separate from application storage.

See `docs/REFACTOR.md` for the compatibility inventory, defect fixes, and validation boundaries. Test-data controls require `NEXT_PUBLIC_ENABLE_DEMO_DATA=true` in development.

## Deployment

Deploy frontend and backend together. Configure `BACKEND_URL` before building; rewrites are resolved during the build. HTTPS on the frontend protects its HttpOnly session cookie. Keep the backend's trusted frontend origin accurate and restrict direct backend exposure as appropriate for your hosting setup.

Database, SMTP, JWT, storage, and service-role secrets belong only in the backend environment. Browser identity remains server-validated. A coordinated rollout is required for cookie-only authentication and document access; users with only legacy browser tokens must sign in again.

Existing data, database schema, numbering, and historical PDFs are unchanged. Ignored `private-storage/legacy-public/` remains a backend backup/import concern and is not deployed with the frontend.
