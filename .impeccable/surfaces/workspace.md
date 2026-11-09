# Miqat workspace — implemented surface brief

## Status and authority

Implemented and documented after source/render review. Authority is the user-approved whole-system engineering/design plan and retained Miqat identity. The context launcher could not run because of engine/cache permission and network constraints. No concept roll, FORM seed, QUALITY BAR card, generated direction contract, or approved concept comp exists for this work. The following is a record of the accepted direction and implemented expression, not a reconstructed workshop artifact.

## THESIS

One task-first workspace makes operations and finance easier to navigate and act on while preserving business behavior and records.

## OWN-WORLD

A working Miqat transport desk: actual fleet, contract, inspection, people, and financial records; Miqat logo/gold; bundled IBM Plex Sans Arabic/Inter; RTL/LTR; quiet neutral surfaces in light/dark. Fine borders and clear labels support work. This direction does not call for a promotional hero.

## STORY

Locate the section through grouped navigation, understand the current page and primary action, filter or inspect real records, then complete a shared form or document task. Captain pages narrow the same system to readiness, inspection, contracts, and account work. Existing URLs remain stable.

## FIRST VIEWPORT

One shell header supplies location and user controls. The page header names the task and groups actions. Dashboard puts today's readiness, key counts, recent contracts, and financial summary in working order. Lists put search and status filters before records. Mobile stacks headings and actions, uses record cards where appropriate, and retains bottom navigation; desktop uses grouped sidebar and wider tables.

## FORM

The observed implementation uses a 248px sidebar (76px collapsed), one 72px desktop header, a responsive content canvas, flat bordered cards, 8px control corners, and a sparse gold action/active-state accent. Small screens use a 64px header, 14px horizontal content insets, wrapping actions, native controls/dialogs, and persistent bottom navigation. These are extracted properties, not a FORM seed.

## Evidence and constraints

Source inspected: app/globals.css; app/layout.tsx and bundled font licenses/files; lib/navigation.ts; DashboardShell; shared PageHeader, FilterBar, StatCard, and StatusBadge. Render evidence inspected directly: /tmp/miqat-redesign-review/dashboard-ar-light-1440.png and /tmp/miqat-redesign-review/fleet-en-dark-390.png. Geometry evidence records one shared header and responsive navigation at 390/768/1440px. Temporary captures are review artifacts, not permanent production assets.

The parent implementation/review reports all 18 Playwright scenarios passing, including the 37-route four-mode matrix, 48 representative captures, creation/payment/expense/inspection flows, failed sign-out recovery, and root routing. This documenter inspected selected captures and source rather than independently rerunning that suite. No live external-service or production verification is claimed here.

Both reviewer findings were corrected in source: the permanently dark invoice total panel caption explicitly uses text-slate-300, and narrow mobile header icon controls now retain the same 44px width and height as desktop controls. The implementation owner is refreshing captures after the 44px correction. Neither finding remains an unresolved design exception.
