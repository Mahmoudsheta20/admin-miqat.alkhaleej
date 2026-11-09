---
name: "Miqat Operations"
description: "Arabic-first operations and finance workspace with Miqat gold and calm working surfaces."
colors:
  accent-gold: "#a16207"
  accent-gold-dark: "#f4c76b"
  accent-surface: "#fef8e8"
  accent-surface-dark: "#292319"
  action-primary: "#9a620b"
  action-primary-hover: "#805006"
  action-primary-dark: "#e8b654"
  action-primary-text: "#ffffff"
  action-primary-text-dark: "#201a0f"
  bg-main: "#f8fafc"
  bg-main-dark: "#070b12"
  bg-card: "#ffffff"
  bg-card-dark: "#0f172a"
  bg-card-subtle: "#f1f5f9"
  bg-card-subtle-dark: "#141f36"
  border-color: "#e2e8f0"
  border-color-dark: "#1e293b"
  border-hover: "#cbd5e1"
  border-hover-dark: "#334155"
  text-main: "#0f172a"
  text-main-dark: "#f8fafc"
  text-muted: "#475569"
  text-muted-dark: "#94a3b8"
  input-bg: "#ffffff"
  input-bg-dark: "#0b1120"
  focus-input: "#f59e0b"
  danger: "#f43f5e"
typography:
  headline: {"fontFamily": "IBM Plex Sans Arabic, Inter, system-ui, sans-serif", "fontSize": "clamp(23px, 2vw, 30px)", "fontWeight": 600, "lineHeight": 1.5}
  body-arabic: {"fontFamily": "IBM Plex Sans Arabic, Inter, system-ui, sans-serif", "fontSize": "15px", "fontWeight": 400, "lineHeight": 1.7, "letterSpacing": "normal"}
  body-english: {"fontFamily": "Inter, IBM Plex Sans Arabic, system-ui, sans-serif", "fontSize": "15px", "fontWeight": 400, "lineHeight": 1.55, "letterSpacing": "normal"}
  page-description: {"fontFamily": "IBM Plex Sans Arabic, Inter, system-ui, sans-serif", "fontSize": "14px", "fontWeight": 400, "lineHeight": 1.8}
  action-label: {"fontFamily": "IBM Plex Sans Arabic, Inter, system-ui, sans-serif", "fontSize": "14px", "fontWeight": 600}
  navigation-label: {"fontFamily": "IBM Plex Sans Arabic, Inter, system-ui, sans-serif", "fontSize": "14px", "fontWeight": 400}
  navigation-group: {"fontFamily": "IBM Plex Sans Arabic, Inter, system-ui, sans-serif", "fontSize": "12px", "fontWeight": 500}
  table-heading: {"fontFamily": "IBM Plex Sans Arabic, Inter, system-ui, sans-serif", "fontSize": "13px", "fontWeight": 500}
  number: {"fontFamily": "ui-monospace, SFMono-Regular, Menlo, monospace", "fontSize": "30px", "fontWeight": 600}
rounded:
  control: "0.5rem"
  surface: "0.875rem"
  card: "16px"
  field-secondary: "12px"
  pill: "9999px"
spacing:
  compact: "4px"
  action-gap: "8px"
  control-gap: "12px"
  control-inset: "16px"
  surface-inset: "20px"
  section: "24px"
  workspace-block: "28px"
  workspace-inline: "32px"
components:
  button-primary: {"backgroundColor": "{colors.action-primary}", "textColor": "{colors.action-primary-text}", "typography": "{typography.action-label}", "rounded": "{rounded.control}", "padding": "10px 16px"}
  button-primary-hover: {"backgroundColor": "{colors.action-primary-hover}"}
  button-primary-dark: {"backgroundColor": "{colors.action-primary-dark}", "textColor": "{colors.action-primary-text-dark}"}
  button-secondary: {"backgroundColor": "{colors.bg-card-subtle}", "textColor": "{colors.text-main}", "rounded": "{rounded.control}", "padding": "10px 16px"}
  input-search: {"backgroundColor": "{colors.input-bg}", "textColor": "{colors.text-main}", "rounded": "{rounded.control}", "padding": "10px 42px"}
  navigation-active: {"backgroundColor": "{colors.accent-surface}", "textColor": "{colors.accent-gold}", "rounded": "{rounded.control}", "padding": "10px 12px"}
  filter-selected: {"backgroundColor": "{colors.accent-surface}", "textColor": "{colors.accent-gold}", "rounded": "{rounded.control}", "padding": "8px 13px"}
  card: {"backgroundColor": "{colors.bg-card}", "textColor": "{colors.text-main}", "rounded": "{rounded.card}", "padding": "20px"}
---

# Design System: Miqat Operations

## Overview

**Creative North Star: "Miqat working operations desk"**

Miqat is a working operations desk: restrained gold identifies actions and current location, while quiet neutral surfaces keep records, readiness, and financial figures readable. Arabic and English have equal functional status; language selects the locally bundled face, and data can retain its own reading direction.

This is an extracted record of the implemented system, using the approved product direction rather than a generated concept. The existing Miqat logo and identity remain authoritative. Surface composition belongs in the workspace brief; this file records reusable visual rules.

**Key Characteristics:**

- Arabic-first with native RTL/LTR behavior.
- Gold for primary actions and current navigation.
- Tonal surfaces, fine borders, and compact working controls.
- Responsive records, readable numbers, and visible keyboard focus.

## Colors

Miqat gold sits against cool neutral working surfaces, with a warmer selected-state wash and matching light/dark foregrounds.

### Primary

- **Miqat Gold** (`accent-gold`, `accent-gold-dark`): active destinations, selected filters, text links, and focus outlines.
- **Action Gold** (`action-primary` and its hover/dark variants): filled primary actions; light and dark variants have distinct foreground tokens.
- **Warm Selection** (`accent-surface` and its dark variant): low emphasis active navigation and filtering backgrounds.

### Neutral

- **Workspace Ground** (`bg-main`): full workspace canvas; the dark variant is near-black.
- **Working Surface** (`bg-card`): sidebar, header, cards, dialogs, and records.
- **Subtle Surface** (`bg-card-subtle`): secondary actions and inset information.
- **Fine Border** (`border-color`, `border-hover`): containers, dividers, and interactive boundaries.
- **Main Ink** (`text-main`) and **Supporting Ink** (`text-muted`): content hierarchy; each follows the active theme.
- **Field Ground** (`input-bg`): editable controls, especially distinct from cards in dark mode.

Sidecar tonal ramps are synthesized visualization aids derived from the source colors; they are not additional application tokens.

Semantic status pills use existing emerald, amber, rose, blue, purple, and slate utility colors for their specific state/type meanings. These are supporting data categories, not additional brand accents. Danger actions use the existing rose foreground and translucent rose surface. The table header follows the workspace ground in light mode and the field ground in dark mode; row hover is a translucent subtle surface/border tone.

## Typography

**Body and interface fonts:** locally bundled IBM Plex Sans Arabic for Arabic and Inter for English, with system sans-serif fallbacks. Both ship real 400/500/600/700 files and license texts under `app/fonts/`.

**Character:** open, functional interface typography. Page titles establish place; labels and records stay compact. There is no separate promotional display face.

### Hierarchy

- **Headline:** the responsive page heading role; semibold with generous Arabic line height.
- **Body:** the language-specific body roles in frontmatter. English has a slightly tighter line height.
- **Page description:** supporting copy beneath page titles, capped at 75ch.
- **Action and navigation:** compact control labels; active navigation is semibold.
- **Table heading and navigation group:** smaller supporting labels with medium weight.
- **Numbers and identifiers:** tabular numeric treatment; financial values and identifiers use the existing monospace stack where implemented. Stat values step from 20px to 24px to 30px across responsive utility sizes; the frontmatter number role records the desktop size.

**The Language Selects the Face Rule.** Use IBM Plex Sans Arabic for Arabic and Inter for English; direction alone must not choose the face. Use only the bundled 400/500/600/700 weights and disable font synthesis.

## Layout

The desktop workspace has a direction-aware sidebar (248px, collapsed 76px), one shared header (minimum 72px), and an independently scrolling main region. Admin content is centered within 1440px; captain content within 1024px. Desktop content insets are 28px vertically and 32px horizontally.

At 1024px the sidebar replaces mobile bottom navigation. Below that breakpoint the main inset becomes 20px; below 640px it becomes 14px horizontally and the header minimum becomes 64px. Page headers stack on small screens and actions wrap. Mobile navigation remains visible above safe-area insets; content reserves 100px below working pages. Search flexes from a 240px basis; filter tabs can scroll horizontally. Tables retain readable columns and record views can use cards.

Controls normally have a 44px minimum height; bottom destinations have 60px minimum height. Header icon controls are 44px square in desktop and narrow mobile headers. Small-screen text fields use 16px text to avoid focus zoom. Main regions and dialogs include safe-area and dynamic-viewport handling. Use logical inline properties so RTL/LTR share a layout.

## Elevation & Depth

The system is flat at rest: cards explicitly remove shadows, and separation comes from background tones and 1px borders. Some record cards retain a modest hover shadow; floating submission controls and dialogs carry functional elevation. Native modal backdrops dim surrounding work; no blur is required.

### Shadow Vocabulary

- **Floating submission bar:** `0 4px 20px rgb(0 0 0 / 0.08)`.
- **Modal backdrop:** black at 65% for the shared application modal; navigation uses a lighter dark wash at 48%.

**The Quiet Surface Rule.** Separate resting workspace regions with tonal surfaces and fine borders. Reserve strong dimming for modal context and modest elevation for floating controls.

State transitions mostly use 150ms ease; the body theme change uses 200ms ease. The loading spinner rotates over 800ms. Reduced-motion rules collapse animations/transitions and disable hover movement. These are state cues, not a page entrance sequence.

## Shapes

Controls use the shared control radius; document surfaces use the shared surface radius. Existing record cards and authentication panels use 16px corners, with 12px inset fields and pills for compact statuses. Borders stay fine. Do not collapse all incumbent shape variants into a single new radius during unrelated work.

## Components

### Buttons

Primary controls combine the action-gold fill, matching foreground, semibold label, 44px minimum height, and shared control radius. Hover deepens the light fill or brightens the dark fill; press scales to 98%. Secondary controls use a subtle surface with a fine border; danger controls use translucent rose. Disabled controls retain native disabled behavior and a muted appearance. Keyboard focus uses a gold 2px outline with 3px offset.

### Inputs / Fields

Search and editable controls use the field ground, fine border, and inherited language font. Search includes an inset icon and optional clear button, with 44px minimum height. Focus changes the field border to amber and adds a soft 3px ring. Existing field shapes include the shared control radius and secondary 12px field radius.

### Navigation

Grouped sidebar links have a 44px minimum height, compact icon/label pairing, and muted default foreground. Hover uses a subtle surface; current location uses gold on the warm selection surface. Group labels are quiet organizational labels, not promotional eyebrows. Shared registry metadata drives role-filtered sidebar, bottom links, breadcrumbs, and page names. Mobile exposes frequent destinations plus the admin full-navigation drawer.

### Chips

Selected filter buttons use gold text and a warm fill; unselected filters stay quiet. Status pills are smaller, fully rounded, bordered labels with status text. Informational pills are not required to have button-sized touch targets unless interactive.

### Cards / Containers

Working cards use the card ground and fine border, commonly with 16px corners and 16–20px padding. Inset subregions use subtle surfaces. Resting cards remain unshadowed. Stat cards expose label, tabular value, optional unit, and supporting text, rather than decorative illustrations.

### Shared page and document controls

The invoice total panel keeps its dark surface across themes; its total caption explicitly uses the light slate supporting foreground rather than inheriting the workspace muted-text token.

Page headers keep heading and description together, with the primary task and compact secondary tools in one action region. Filters follow the header. Document previews use a wrapped toolbar, bounded dynamic-viewport height, and their own scrolling region; document content remains a separate official artifact.

## Do's and Don'ts

### Do:

- **Do** use the semantic light/dark surface, foreground, border, and accent tokens together.
- **Do** keep Arabic and English labels readable, preserve stored names, and isolate mixed-direction identifiers.
- **Do** give controls visible focus and preserve native dialog, button, input, and disclosure behavior.
- **Do** keep status meaning in text as well as color.
- **Do** use the shared page header, filters, document controls, and role-aware navigation.

### Don't:

- **Don't** replace the Miqat identity with Newsky branding; only the approved font pairing is shared.
- **Don't** introduce decorative glass, gradient headlines, purple glows, or synthesized black font weights.
- **Don't** convert source-code compatibility names containing gradient into a requirement for gradient fills.
- **Don't** use the muted foreground on a permanently dark panel without checking that panel's own foreground contrast.
