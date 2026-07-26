# Architecture — Academic OS

> **Source-of-truth scope:** technical architecture and engineering decisions. Product behavior lives in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md); entity/persistence detail lives in [DATA_MODEL.md](./DATA_MODEL.md); threat model lives in [SECURITY.md](./SECURITY.md).

## Guiding constraints (from the product spec)

- Local-first: no accounts, no mandatory backend, no mandatory remote database.
- Must become a production-quality, installable, offline-capable PWA.
- Will eventually store potentially large binary content (images, PDFs, videos) alongside structured data spanning years of semesters.
- Must support future analytics computed from raw data, safe export/import of untrusted archives, and non-destructive schema evolution.
- Solo personal project: avoid enterprise overengineering, but do not choose throwaway-prototype patterns either.

## Selected Stack

| Concern | Choice | Alternatives considered |
|---|---|---|
| Language | TypeScript (strict mode) | Plain JS — rejected: this app has enough entity/relationship complexity (grades, schedules, archive schemas) that compile-time checking materially reduces data-integrity bugs. |
| UI framework | React 18+ | Svelte/SvelteKit, Vue — React chosen for the largest ecosystem of mature, actively-maintained local-first/IndexedDB tooling (Dexie's official React hooks, Zod integration patterns, Recharts, testing-library support), and because it is the framework most future Claude Code sessions will be able to work in reliably. |
| Build tool | Vite | Next.js, CRA — Next.js is server-oriented (SSR/routing conventions aimed at backend-integrated apps) and adds complexity this local-only SPA does not need; CRA is unmaintained. Vite gives fast dev/build and first-class `vite-plugin-pwa` support. |
| Routing | React Router (client-side only) | TanStack Router — React Router is more ubiquitous and sufficient for this app's shallow route tree; TanStack Router's type-safe routing is a nice-to-have, not a requirement here. |
| Structured local storage | IndexedDB via **Dexie.js** | Raw `idb`/`idb-keyval` (too low-level for relational-ish queries across Courses/Units/Tasks/Grades), PouchDB (built around sync/replication we don't need and adds significant weight), WASM SQLite via `sql.js`/`wa-sqlite` (powerful but materially heavier, harder to ship reliably as a PWA, and overkill for this data volume). Dexie gives typed schemas, versioned migrations, compound indexes, transactions, and official `dexie-react-hooks` for live-updating queries — the best fit for "relational-shaped data in the browser" without a query engine we'd have to maintain. |
| Blob/file storage | Blobs stored directly in a dedicated Dexie table, referenced by id | File System Access API (Chrome/Edge desktop only — not cross-platform, so kept as a *possible future enhancement*, not the baseline) | 
| Validation | Zod | Yup, io-ts — Zod has the best TypeScript inference, is actively maintained, and is used both for form/input validation and for validating untrusted imported archive JSON against a versioned schema. |
| State management | Dexie live queries (`useLiveQuery`) for persisted data + React Context for small ephemeral UI state (active semester id cache, theme) | Redux, Zustand, MobX — rejected as an extra layer: once data lives in IndexedDB and is reactively queried via Dexie hooks, a separate global store for the same data would be a redundant cache to keep in sync. No non-trivial cross-cutting ephemeral state exists yet that would justify a dedicated state library. |
| PWA tooling | `vite-plugin-pwa` (Workbox under the hood) | Hand-rolled service worker — rejected: Workbox's precaching/versioning is well-tested; hand-rolling risks exactly the "stale/corrupt state after deploy" failure mode the spec warns against. |
| Charting (Stage 6) | Recharts | visx, Chart.js, D3 directly — Recharts is React-idiomatic, SVG-based (accessible, stylable), and sufficient for the trend/comparison charts described in the product spec; D3-direct or visx are lower-level than needed. |
| Archive/zip generation | JSZip | Rejected building a custom zip writer — JSZip is the mature, widely-used standard for client-side zip creation (used for both the semester archive's optional bundling and the media export zip). |
| Testing | Vitest + React Testing Library + `fake-indexeddb` (unit/integration); Playwright (future E2E/offline/PWA) | Jest — Vitest is the natural pairing with Vite (shared config/transform, faster), actively maintained, Jest-API-compatible. |
| Package manager | npm | pnpm, yarn — npm ships with Node and is sufficient for a solo project; minimizes tooling surface. (Documented as a low-stakes choice; can switch before Stage 2 if preferred.) |
| Hosting | **Netlify — approved** | Vercel, Cloudflare Pages, GitHub Pages were considered; any static host works since this is a backend-less SPA. Netlify is the product owner's approved choice for: zero-config GitHub integration, automatic PR deploy previews, atomic deploys with one-click rollback, generous free tier, easy custom domain. This is now a settled decision, not an open question — actual Netlify project setup/configuration is a Stage 2 task. |
| CI | GitHub Actions | Runs typecheck, lint, unit tests, and build on every push/PR. Hosting provider deploys `main` to production and PRs to preview URLs. |

Dependency count is intentionally small: React, React Router, Dexie, dexie-react-hooks, Zod, JSZip, and (Stage 6+) Recharts as runtime dependencies; Vite, vite-plugin-pwa, TypeScript, Vitest, Testing Library, fake-indexeddb, ESLint, Prettier as dev dependencies. No CSS framework is mandated by Stage 0 — that is a Stage 1 design-system decision.

## Application Shape

Single-page application, no server-rendered pages, no API layer. All persistence is client-side (IndexedDB via Dexie). The "backend" of this product is the user's own browser storage.

```
UI (React components, Stage 1 design system)
   ↓ reads/writes via
Domain layer (pure functions: grade math, week math, attendance %, validation)
   ↓ reads/writes via
Repository layer (Dexie table access, one module per aggregate: courses, units, tasks, schedule, grades, practice, checkins, blobs)
   ↓ persisted in
Two IndexedDB databases: `academic-os-preferences` (never cleared by semester reset) and `academic-os-semester` (the active semester workspace)
```

Keeping domain logic (grade calculations, week boundaries, attendance percentage, archive validation) as **pure, framework-independent functions** is deliberate: it is what makes them unit-testable without a browser and reusable by the future analytics layer, the export/import validators, and the UI.

## Academic Week Utility

A single module, e.g. `src/domain/academicWeek.ts`, exposes something like:

```ts
function getAcademicWeek(date: Date): { start: Date; end: Date } // Sat 00:00:00.000 → Fri 23:59:59.999, local time
function isSameAcademicWeek(a: Date, b: Date): boolean
function addAcademicWeeks(date: Date, n: number): Date
```

Every feature that groups or buckets by week (task Overdue/Today/Upcoming grouping, weekly schedule, attendance-by-week, weekly check-in) imports this module. No feature is permitted to re-derive week boundaries independently — this is a direct requirement from the product spec and a common source of subtle timezone/DST bugs if duplicated.

## Extensibility Points (designed now, built later)

- **Unit types** and **schedule event types**: stored as plain strings with a suggested default set in the UI, not a closed enum in the database — new custom types require no migration.
- **Content blocks**: modeled as a discriminated union keyed by `type` (`text | file | image | video`, extendable later, e.g. `link`, `checklist`) so a new block type is an additive schema change, not a redesign. See DATA_MODEL.md §ContentBlock.
- **Course metadata**: the Course record includes a small forward-compatible free-form `metadata` field consideration (see DATA_MODEL.md) so genuinely new optional attributes don't require a breaking migration for minor additions.

## PWA Strategy

- **Manifest**: name/short_name, icons including a maskable variant, `theme_color`, `background_color`, `display: "standalone"`, `start_url` and `scope` set to the app root.
- **Service worker**: generated by `vite-plugin-pwa` (Workbox). Precache the app shell (HTML/CSS/JS/icons) only — user data lives in IndexedDB, never in the SW cache, so the SW has zero risk of serving stale *data*, only stale *code*.
- **Update strategy**: `registerType: "prompt"`, not `"autoUpdate"`. A silent auto-reload could interrupt a user mid-form (e.g. entering a grade) and cause confusing state or lost input. Instead, the app shows an in-app "Update available — refresh to apply" banner once a new service worker has installed and is waiting, and the refresh happens only on explicit user action (`skipWaiting()` + `clients.claim()` triggered from that action, not automatically).
- **`index.html` / navigation requests**: served with short/no-cache semantics (Netlify's default headers are adequate for this) so clients reliably discover new deployments instead of being pinned to a stale shell indefinitely.
- **Offline**: after first load (or install), core functionality — viewing/editing courses, units, tasks, schedule, grades, all of which are local reads/writes — works fully offline, since there is no network dependency for any of it.

### Platform differences (must not be glossed over)

| Capability | Desktop Chrome/Edge | Android Chrome | iOS/iPadOS Safari | Desktop Firefox/Safari |
|---|---|---|---|---|
| Install prompt (`beforeinstallprompt`) | Yes | Yes | No (manual "Add to Home Screen" only) | No native prompt API |
| Standalone display mode | Yes | Yes | Yes (after manual add) | Partial/varies |
| IndexedDB large blob storage | Reliable | Reliable | Historically less reliable; more aggressive eviction under storage pressure | Reliable (Firefox), historically buggy (older Safari) |
| `navigator.storage.persist()` | Supported, best-effort | Supported, best-effort | Not reliably supported | Supported (Firefox), unreliable (Safari) |
| Web Notifications while app closed | N/A without push | N/A without push | Not supported for web apps in the same way as native | N/A without push |
| Background/periodic sync | Limited support | Limited support | Not supported | Not supported |

### Notifications — platform constraints

Reliable "notify me before class even if the app/browser is fully closed" requires either (a) a push-capable backend server holding subscriptions and sending Push API messages, or (b) the browser proactively waking the app via Periodic Background Sync — both are inconsistently supported (especially on iOS) and (a) directly conflicts with the local-first/no-mandatory-backend requirement. The honest, documented plan for a later stage:

1. **Baseline**: in-app reminders shown when the app is open/foregrounded (check "what's starting soon" on load/focus) — works everywhere, no platform dependency.
2. **Best-effort enhancement**: local `Notification` API scheduling while the app/tab is open (e.g. via `setTimeout`/a lightweight in-page scheduler), which degrades gracefully to nothing if the tab isn't open — documented to the user as "reminders work while Academic OS is open or recently used," not as a guaranteed background alarm.
3. **Explicitly out of scope for v1**: true OS-level background push notifications, since that would require introducing a backend, which this product deliberately avoids. If ever revisited, it would need to be an opt-in feature with a clearly disclosed third-party push relay — a real change to the privacy model requiring explicit product-owner approval.

## Performance Considerations

- List views (course list, unit list, task list) query only metadata columns — Dexie's blob table is never joined into a metadata query; blob bytes are fetched only when a specific content block is opened.
- Dexie compound indexes are defined on the foreign keys used for the app's actual access patterns (e.g. `Units` by `courseId+order`, `Tasks` by `dueDate`, `ScheduleOccurrence` by `date`) to keep list rendering fast as data grows into the hundreds/thousands of rows.
- Schedule occurrences are generated **on demand** for the week(s) being viewed rather than pre-materializing an entire semester's worth of dated rows up front (see DATA_MODEL.md §"Schedule Templates vs. Occurrences") — this bounds table growth to what the user has actually looked at/marked attendance for.
- Large media (course PDFs/videos) are excluded from the default semester archive precisely so export/import operations stay fast and bounded regardless of how much material a course accumulates (§16/§17 of the product spec).

## Resolved Since Initial Draft

Hosting (Netlify), Tag scope (global/persistent, see DATA_MODEL.md §Tag), text content block richness (safe Markdown-style, see PRODUCT_SPEC.md §5 and SECURITY.md §1), historical-semester browsing (out of scope for v1, export-only), default Unit Type list, and repository license/visibility (MIT, public — see LICENSE) were all open questions in the initial Stage 0 draft and have since been resolved by the product owner. See STAGE_0_REPORT.md §"Decisions Made" for the consolidated record and §"Open Questions" for anything still outstanding.
