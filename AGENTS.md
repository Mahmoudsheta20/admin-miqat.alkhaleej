# Project Conventions & Engineering Guidelines

## 1. Project Overview

- **Project**: Miqat Operations & Fleet Management System (نظام ميقات الخليج لإدارة الأسطول والرحلات)
- **Stack**: Next.js 16 (App Router), React 19, TypeScript 5, TailwindCSS v4, Prisma ORM (SQLite dev / PostgreSQL prod), Puppeteer-core (PDF generation), Lucide React (icons)
- **Language/Direction**: Arabic-first RTL UI. `<html lang="ar" dir="rtl">`.
- **Fonts**: Zain (Arabic body/display, Google Fonts wght 200..900), Outfit (Latin/English fallback).
- **Theme**: Dual Light/Dark mode via CSS custom properties + `localStorage` persistence. Theme class toggled on `<html>`.
- **Auth**: Client-side session via React Context + `localStorage` (`miqat_auth_user`). 4 roles: `ADMIN`, `OPERATIONS`, `DISPATCHER`, `DRIVER`.

---

## 2. Next.js Architecture (App Router)

- **Async Request APIs**: `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are all asynchronous. Always `await` them in Server Components/Route Handlers, or unwrap a passed-down promise with `use()` in Client Components.
- **Route Group Convention**: Dashboard pages live under `app/(dashboard)/` which provides the shared sidebar + header layout. The route group does NOT appear in the URL. Login lives at `app/login/` outside the group.
- **Client Components for Interactive Pages**: Dashboard pages use `"use client"` because they depend on `useAuth()`, `useTheme()`, and interactive state. This is intentional — the admin portal is a client-heavy SPA.
- **Server Components for API Routes**: All `app/api/**/route.ts` files are server-only. They use Prisma directly.
- **Data Fetching & Waterfalls**: Fetch independent data in parallel with `Promise.all()`, not sequential `await` chains. Push slow, non-critical fetches below a `<Suspense fallback={<Skeleton />}>` boundary so the shell paints first.
- **Caching & Revalidation**: Be explicit about `fetch` cache behavior (`cache: 'force-cache' | 'no-store'`, `next: { revalidate, tags }`). Invalidate with `revalidatePath()` / `revalidateTag()` from Server Actions.
- **Route Segment Files**: Every route that can fail or take time gets its own `loading.tsx` and `error.tsx` (client component, receives `error`/`reset`). Use `not-found.tsx` for explicit 404s.
- **Metadata & SEO**: Use the `generateMetadata` export (async, can read `params`) instead of hardcoded `<head>` tags for page-level metadata. Root metadata is in `app/layout.tsx`.
- **Image & Font Optimization**: No raw `<img>` tags. Use `next/image` with explicit `width`/`height` or `fill` + a sized parent.

---

## 3. Database & Prisma ORM

- **Schema Location**: `prisma/schema.prisma`. SQLite for local dev (`prisma/dev.db`), switchable to PostgreSQL for production.
- **Prisma Client Singleton**: Imported from `@/lib/prisma` — uses global caching to avoid multiple instances in dev.
- **Enum Types**: `Role`, `VehicleStatus`, `DriverStatus`, `TripStatus`, `PaymentStatus` defined in Prisma schema. Mirror these in `lib/types.ts` as TypeScript union types.
- **Relations**: `User` ↔ `Driver` (1:1), `Driver` ↔ `Vehicle` (1:1), `TripOrder` ↔ `Driver`/`Vehicle`/`Passenger`/`VehicleInspection`/`ContractDocument`.
- **Seed Data**: `prisma/seed.mjs` — run with `npx prisma db seed`.
- **Schema Changes**: After editing `schema.prisma`, run `npx prisma db push` (dev) or `npx prisma migrate dev` (production migrations).

---

## 4. RBAC (Role-Based Access Control)

- **4 Roles**: `ADMIN` (full access), `OPERATIONS` (fleet + drivers + trips), `DISPATCHER` (trips + contracts only), `DRIVER` (driver portal only).
- **Sidebar Visibility**: `Sidebar.tsx` filters nav items by `user.role`. Each `NavItem` has a `roles` array.
- **API-Level Enforcement**: API routes should validate the caller's role before performing write operations. Admin & Operations can create/edit drivers. Only Admin can deactivate users.
- **Page-Level Guards**: The `(dashboard)/layout.tsx` redirects unauthenticated users to `/login` and drivers to `/driver-portal`.

---

## 5. Data, State & Validation

- **TypeScript Types**: Defined in `lib/types.ts`. Every entity has a named interface: `SystemUser`, `Vehicle`, `Driver`, `TripOrder`, `TripPassenger`, `DailyInspection`, etc.
- **API Hook**: `lib/useApi.ts` provides `useApi<T>(url)` for GET requests with loading/error/refetch states, and `apiMutate(url, method, body)` for POST/PUT/PATCH/DELETE.
- **Server State vs. UI State**: Pages fetch data from API routes on mount. Local UI state (search filters, modal open/close, form inputs) uses `useState`. Data refetch is triggered after mutations via `refetch()`.
- **Environment & Secrets**: `DATABASE_URL` and any API keys go in `.env`. Validate presence at startup. Anything without `NEXT_PUBLIC_` never reaches client code.

---

## 6. Design System & Aesthetic

### Color Tokens (CSS Custom Properties in `globals.css`)

- **Light Mode** (default): Canvas `#f8fafc`, cards `#ffffff`, text `#0f172a`, borders `#e2e8f0`, muted text `#64748b`.
- **Dark Mode** (`html.dark`): Canvas `#080c14`, cards `#0f172a`, text `#f8fafc`, borders `#1e293b`.
- **Accent**: Amber/gold for primary actions (`#d97706` → `#f59e0b`). Emerald for success/available. Rose for danger/cancelled. Blue for new/info.

### Utility CSS Classes

- `.theme-card` — card with background, border, shadow
- `.theme-card-subtle` — muted card background
- `.theme-input` — form input styling
- `.theme-border` — border color
- `.gold-gradient-btn` — primary CTA button
- `.gold-gradient-text` — gradient text accent

### Anti-AI Design Rules

- **No purple/indigo glows**, no generic glassmorphism, no cliché 3-column feature grids, no gradient text headlines.
- **Typography**: Zain (Arabic, weights 200–900) + Outfit (Latin). Monospace `font-mono` for IDs, phone numbers, dates, contract numbers.
- **Spacing**: Vary rhythm deliberately — tight tables vs. generous card padding. Not uniform `space-y-4` everywhere.
- **Micro-Interactions**: `transition-all duration-200`, `hover:shadow-md`, `active:scale-[0.98]` for buttons. Skeleton loaders that mirror data shape.

---

## 7. Component Architecture

### Shared Components (`app/_components/`)

Components used across multiple pages. Each is a `"use client"` component:

- `Sidebar.tsx` — collapsible sidebar with role-based navigation
- `Header.tsx` — persistent top header with clock, user pill, theme toggle, logout
- `StatusBadge.tsx` — reusable status badge for trips/drivers/vehicles/payments/inspections
- `ConfirmDialog.tsx` — confirmation modal (danger/warning/info variants)
- `AddDriverModal.tsx` — form to create new captain
- `EditDriverModal.tsx` — form to edit captain details
- `NewTripModal.tsx` — form to create new trip
- `AssignDriverModal.tsx` — assign driver + vehicle to a trip
- `PassengerManifestModal.tsx` — manage passenger list for a trip
- `PdfPreviewModal.tsx` — preview/download generated contract PDF

### Route Structure

```
app/
├── layout.tsx              # Root layout (html/body, providers, fonts)
├── login/page.tsx          # Login page (outside dashboard group)
├── (dashboard)/
│   ├── layout.tsx          # Dashboard layout (sidebar + header + auth guard)
│   ├── page.tsx            # Root redirect → /overview
│   ├── overview/page.tsx   # KPI cards, recent trips, quick actions
│   ├── drivers/page.tsx    # Captain management (CRUD)
│   ├── fleet/page.tsx      # Vehicle management
│   ├── requests/page.tsx   # Trip request workflow board
│   ├── trips/page.tsx      # Trip dispatch management
│   ├── contracts/page.tsx  # Contract generation & list
│   └── driver-portal/page.tsx  # Mobile driver inspection portal
├── _components/            # Shared client components
├── api/                    # API routes (Prisma server-side)
│   ├── drivers/            # GET list, POST create
│   ├── drivers/[id]/       # GET single, PUT update, PATCH status
│   ├── fleet/              # GET list, POST create
│   ├── trips/              # GET list, POST create
│   ├── trips/[id]/         # GET single, PUT update
│   ├── contracts/          # Preview + PDF generation
│   ├── inspections/        # Vehicle inspection CRUD
│   └── dashboard/stats/    # Aggregated KPI statistics
```

---

## 8. Code Standards & File Hygiene

- **Strict TypeScript**: No `any`, no non-null assertions (`!`). Every server payload and component prop gets a named interface.
- **Naming**: `PascalCase` components, `camelCase` functions/variables, `kebab-case` file and route segment names, `SCREAMING_SNAKE_CASE` for module-level constants. Boolean props read as questions (`isLoading`, `hasError`).
- **Colocation**: Route-specific helpers and subcomponents live inside that route's folder. Shared components go in `app/_components/`. Shared lib utilities go in `lib/`.
- **Error Handling**: API Route Handlers return `NextResponse.json({ error: "message" }, { status: 4xx/5xx })` for errors, never throw to the client. Use try/catch in all API handlers.
- **Arabic Strings**: All user-facing text is Arabic. Variable names and code comments are in English.

---

## 9. Accessibility & Performance

- **RTL Layout**: All layouts use `dir="rtl"`. CSS properties like `margin-right` / `padding-left` are handled by Tailwind's logical properties where possible.
- **Semantic HTML First**: Native `<button>`, `<a>`, `<nav>`, `<dialog>`, `<table>` before reaching for ARIA. Every interactive element is keyboard-reachable with a visible focus state.
- **Contrast & Motion**: Text meets WCAG AA contrast in both light and dark mode. Non-essential animations respect `prefers-reduced-motion`.
- **Bundle Discipline**: Default to client components only when interactivity is needed. Use `dynamic(() => import(...), { ssr: false })` for heavy widgets (PDF preview, charts) to avoid blocking hydration.
- **Scrollbar Styling**: Custom slim scrollbars via `::-webkit-scrollbar` for a polished look in both themes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
