# Miqat engineering guide

## Architecture
- Next.js 16 App Router, React 19, strict TypeScript, Tailwind v4. Interactive admin/captain routes intentionally use client components.
- Express, Prisma/PostgreSQL, storage, email, and PDF generation belong in the sibling `backend-miqat.alkhaleej` project. Do not reintroduce a frontend database client or duplicate business API routes.
- Existing browser URLs are compatibility contracts: retain deep links and query parameters when reorganizing features.
- Request APIs (`params`, `searchParams`, `cookies`, `headers`) are asynchronous. Read the installed Next.js guides before changing framework behavior.

## Authentication and authorization
- Roles are `ADMIN` and `CAPTAIN`; Express enforces role and record ownership. The privileged administrator restriction remains in the backend.
- Browser requests use `/api/proxy/` and server-issued HttpOnly cookies. Never persist session tokens/profile identities in localStorage, return browser tokens in JSON, or put credentials in document URLs.
- Preserve session-only versus persistent login behavior. Validate mutation origins independently of CORS in every environment.
- Secrets and database credentials belong exclusively in the backend environment. Server-side `BACKEND_URL` configures the proxy target; `NEXT_PUBLIC_BACKEND_URL` is a compatibility fallback.

## Organization and data
- Shared navigation metadata lives in `lib/navigation.ts`; desktop/mobile navigation, breadcrumbs, and titles derive from it. Do not restore workspace switching or separate navigation arrays.
- Colocate feature-specific UI and guides with their route. Reuse shared form, document, and UI components under `app/_components/`.
- Typed HTTP adapters remain under `app/_actions/` for import compatibility; these are ordinary client-safe modules, not Server Actions.
- Use `useApiQuery` for keyed, session-scoped reads. Successful mutations invalidate cached reads. Keep UI-only draft state separate from API state.
- Persist list filters with `useUrlState`; preserve unrelated query parameters. Do not silently merge different financial entities or invoice types.
- Use exact decimal/minor-unit helpers for money. Never rewrite historical totals, contract IDs, document numbering, tax snapshots, or QR data during a UI refactor.
- Changes to database schemas require an explicit migration and isolated verification; never run schema push or seed against production as part of UI work.

## Design and accessibility
- Arabic RTL is the default; English LTR and both themes are supported. Translate UI labels only, never customer names or stored business data.
- Use locally bundled IBM Plex Sans Arabic (Arabic) and Inter (English), weights 400/500/600/700. Font licenses ship alongside assets.
- Preserve Miqat branding and gold accents. Use semantic tokens in `app/globals.css`, quiet surfaces, clear tables, readable labels, and purposeful spacing. No decorative glass, gradient headlines, purple glows, or synthesized black font weights.
- Prefer native controls and dialogs. Keep focus visible, all actions keyboard-accessible, and touch targets at least 44px. Respect reduced motion.
- Shared inspection definitions live in `lib/inspection.ts`; contract guest/journey/issue-date fields and inspection checklist UI are shared components.
- New PDF templates use the backend's bundled `documentFontCss`; do not fetch external fonts while rendering.
- Use Next Image for images and dynamic loading for heavy document previews. Provide loading, empty, and recoverable error states.

## Quality
- No new `any` or non-null assertions. Use named payload/prop interfaces and `unknown` for untrusted data.
- Frontend checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:e2e`.
- Browser tests use the isolated fixture backend on 5109 and UI on 3419. They do not use a live database. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` for non-macOS Chrome installations.
- The production build uses the supported webpack compiler; development uses Next's default compiler. Browser-test caches and reports are ignored.
- Test data controls are available only in development with `NEXT_PUBLIC_ENABLE_DEMO_DATA=true`.
- Run backend tests/typecheck/build after changing APIs. Distinguish fixture coverage from SMTP, S3, external ZATCA, and live database verification.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
