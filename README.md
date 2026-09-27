# Miqat Admin

Arabic RTL administration and captain UI, built with Next.js 16 and React 19.
All business APIs run in the sibling **`backend-miqat.alkhaleej` Express project**.

## Run locally

Use Node.js 22.12+ (Node 24 recommended).

1. Configure and start the backend using its README.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_BACKEND_URL=http://localhost:5001`.
3. Run `npm ci`, then `npm run dev`.
4. Open `http://localhost:3000`. Use the same hostname consistently; do not mix `localhost` and `127.0.0.1`.

The backend's `FRONTEND_URL` must exactly match the frontend origin, including port.
Database, SMTP, JWT, S3, and service-role secrets belong exclusively in the backend environment.
Existing local `.env` files were preserved; remove obsolete backend secrets from the frontend deployment configuration.

## Architecture

- `lib/backend.ts`: credentialed HTTP client, timeouts, query encoding, response envelopes.
- `app/_actions/`: typed HTTP adapters retained at their existing import paths. These are ordinary modules, **not Next.js Server Actions**.
- `lib/authContext.tsx`: session profile retrieved from Express. Authentication uses an HttpOnly backend cookie; no localStorage identity or editable role cookie.
- `app/(admin)` / `app/(captain)`: presentation and client-side navigation guards. Express enforces authorization for every protected operation.
- Document previews/downloads and uploads go directly to Express. Public verification pages fetch limited verification data without passenger or captain personal details.
- Prisma, email, PDF generation, storage and password processing are owned by Express. No Next.js API routes or database client remain here.

## Deploy

Deploy the frontend and backend together. Use HTTPS sibling origins on the same site, for example `admin.example.com` and `api.example.com`, so SameSite=Lax cookies work for API requests and document iframes.
`NEXT_PUBLIC_BACKEND_URL` is compiled into the frontend: rebuild after changing it.
Configure the backend origin and a fresh JWT secret before starting it. Existing legacy sessions must sign in again.

Existing PDFs previously exposed in `public/` were moved, without deleting their contents, to ignored `private-storage/legacy-public/`. Back up or import that directory into private backend storage; it is not included in a frontend deployment or git commit.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```

Run `npm test` and `npm run build` in the backend too. Its regression tests mock database calls and do not modify a live database. Full live CRUD, SMTP delivery and S3/PDF rendering require configured services and a test account.
