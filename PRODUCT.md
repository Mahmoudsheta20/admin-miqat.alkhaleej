# Miqat Operations

## Product and users

Miqat Al Khaleej is an Arabic-first operations and finance workspace for a land-transport business. Administrators manage fleet readiness, captains, journeys, contracts, customers, people, invoices, purchasing, accounting, tax reporting, and company settings. Captains use Home, Inspection, Contracts, and Account for their daily work. Public verification pages confirm the corresponding contract, inspection, or invoice through existing references.

## Approved scope and durable decisions

The user approved implementation of the whole-system refactor/redesign: organize sections, simplify repeated tasks and fields, remove duplicate implementation, fix discovered defects, and make the interface clear and modern. Admin navigation is grouped into Overview, Operations, People, Finance, and Settings; captain destinations stay focused on their four tasks. Shared navigation, forms, inspection definitions, filtering, document controls, and query behavior are preferred to repeated flows.

Miqat branding and gold accents remain. The user selected the same font pairing as the Newsky admin: locally bundled IBM Plex Sans Arabic and Inter with actual 400/500/600/700 files. This is a typography decision, not a Newsky rebrand. Arabic RTL is the default; English LTR and both themes are supported. Translate UI labels while preserving customer names and stored business data.

## Compatibility and authority

Existing browser URLs and query parameters are contracts. Preserve record identities, historical totals, exact decimal calculations, contract identifiers, document numbering, tax snapshots, QR data, and official document layouts. Financial entities and invoice types remain distinct. This work does not authorize a schema migration or production seed.

The frontend is Next.js 16 / React 19 with client-side admin/captain interaction. The sibling Express/Prisma backend owns authentication, authorization, persistence, documents, email, and storage. Browser requests and protected documents use the same-origin cookie-authenticated proxy; session tokens and profile identities do not belong in browser storage or document URLs. ADMIN/CAPTAIN ownership and the privileged administrator restriction remain server enforced. README.md, docs/REFACTOR.md, and AGENTS.md describe engineering ownership and verification boundaries.

## Direction and provenance

This was code-led execution of an explicit user-approved engineering and design plan. The Impeccable context launcher was unavailable because of engine/cache permission and network constraints. Consequently there was no original generated direction contract, concept roll, FORM seed, QUALITY BAR card, or approved concept comp. None is claimed or retrospectively fabricated.

The accepted direction was task-first unified operations and finance: real records and forms define composition, quiet working surfaces establish hierarchy, clear filters/tables support finding records, and primary actions support the current task. The implementation was reviewed through final rendered pages. DESIGN.md is a post-implementation extraction from source and renders, not evidence of a pre-implementation visual workshop. The workspace surface brief records how that accepted direction appears on the pages.

## Validation boundaries

Fixture browser coverage and source/unit checks are evidence about the application under their documented conditions. They do not establish live SMTP, storage permissions, external ZATCA submission, production CRUD, or production data correctness. The implementation report in docs/REFACTOR.md owns the detailed test inventory and limitations; do not infer those integrations were exercised merely from interface screenshots.
