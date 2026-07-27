# Changelog

All notable changes to this project are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows [Semantic Versioning](https://semver.org/) and is pre-1.0 during development (see `docs/DEVELOPMENT.md` §Versioning).

## [Unreleased]

## [0.4.0] - 2026-07-27

Stage 4: deterministic academic analytics — semester/course metrics, trend analysis, and an explainable insight engine, replacing Performance's Stage 3 "real totals only" placeholder with the actual analytics product `docs/ROADMAP.md`'s original Stage 6 described (pulled forward into "Stage 4" by the product owner's task prompt — see `docs/ROADMAP.md` and `docs/STAGE_4_REPORT.md`). Everything is computed client-side from real Stage 3 data; nothing is AI/LLM-generated, random, or fixture-driven. One new runtime dependency (Recharts), already pre-approved in `docs/ARCHITECTURE.md`'s stack table.

### Added

- `src/domain/analytics/` — a new pure, fully-tested analytics domain layer: `trend.ts` (deterministic improving/declining/stable/insufficient-data classification), `taskAnalytics.ts`, `attendanceAnalytics.ts`, `gradeAnalytics.ts`, `practiceAnalytics.ts` (per-dimension metrics, each respecting the exact Stage 3 semantics — `TaskCompletionEvent` history, cancelled/unmarked attendance exclusion, both grade modes, Practice kept separate from Grades), `courseAnalytics.ts` (a multi-dimensional per-course profile — deliberately no single blended "course score"), `semesterAnalytics.ts` (semester-wide aggregation as a ratio of sums, never a naive average of each course's percentage), and `insights.ts` (a bounded, deterministic insight engine with documented thresholds and priority ranking).
- `src/features/shared/useAnalytics.ts` — the single reactive hook (`useSemesterAnalytics`, `useInsights`) every analytics surface reads from; recomputes automatically via `dexie-react-hooks` whenever a task/attendance/grade/practice/course record changes anywhere in the app.
- **Performance** is now the real analytics dashboard: a semester overview that distinguishes "no data yet" from a real 0%, real trend charts (Recharts line charts, never rendered from fewer than 2 chronological points), a per-course comparison table, and a ranked "Academic insights" list with human-readable evidence for every insight.
- **Home** gains exactly one plain-text, top-priority insight line (no chart, no widget) — the one exception `STAGE_1A_UX_ARCHITECTURE.md` §G already allowed ("at most one plain-text weekly stat… never before there's enough data to be meaningful"), sourced from the same insight engine Performance uses.
- **Course Detail** gains a "View analytics for this course" link into Performance's course filter (`?course=` query param) — no new tab, matching §H's explicit "no dedicated Course Detail Analytics tab in v1."
- Tests: 42 new domain unit tests (trend/task/attendance/grade/practice/semester/insight rules — real math assertions, not snapshots) plus a real-Dexie integration test proving the analytics hook updates reactively after mutating persisted data; a new `e2e/analytics.spec.ts` golden path (real course/task/attendance/grade/practice data → real calculated Performance metrics → insight → mutate → re-verify → Course Detail link → Home insight → reload).

### Changed

- `package.json`: added `recharts`. Introduces zero new `npm audit` advisories.
- `docs/ARCHITECTURE.md`: Recharts moved from "planned for Stage 6" to installed/consumed.

## [0.3.0] - 2026-07-27

Stage 3: real, persisted Course/Unit/Content/Schedule/Task/Attendance/Grade/Practice CRUD and Semester Export, replacing every remaining Stage 2 reference fixture. This release's scope corresponds to the original roadmap's Stages 3–5 combined plus the Semester Export portion of Stage 7 — see `docs/ROADMAP.md`'s Stage 3 entry for the documented scope redefinition, and `docs/STAGE_3_REPORT.md` for the full report. No new runtime or dev dependencies were added.

### Added

- **Courses**: full create/edit/delete, tag assignment, real `courseRepository` backing the Courses list and Course Detail (`src/data/repositories/courseRepository.ts`).
- **Units**: full create/edit/delete/ordering (`unitRepository.ts`), a real Course Detail → Unit Detail workflow.
- **Content Blocks**: real Markdown text blocks (write/preview, safely rendered via the existing `SafeMarkdown` renderer — no new dependency) and real file/image/video upload backed by a new `Blob` table (Dexie `academic-os-semester` schema version 2, purely additive) with intake validation (`src/domain/contentValidation.ts`) and object-URL preview/download.
- **Tasks**: real create/edit/delete and completion toggling through `taskRepository.ts`, writing an immutable `TaskCompletionEvent` for every transition (never just a mutable boolean) alongside `Task`'s derived `completed`/`completedAt` fields, in one transaction. A shared `useTasks` hook keeps Home/Tasks/Course/Unit views in sync.
- **Schedule**: real recurring `ScheduleTemplate` CRUD and lazy `ScheduleOccurrence` generation/materialization (`scheduleRepository.ts`, `src/domain/scheduleGeneration.ts`) — occurrences are generated on demand per viewed week and never regenerated from an edited/deleted template, preserving historical attendance exactly per DATA_MODEL.md.
- **Attendance**: real marking/correcting through the existing `AttendanceControl`, now wired to persisted occurrences everywhere it appears (Home, Schedule week/day/grid views, Course Detail).
- **Grades**: real Simple and Structured Mode entry/category CRUD (`gradeRepository.ts`), plus a completed grade-calculation domain layer (`src/domain/gradeSummary.ts`): current performance percent, remaining available points, max possible final score, required score for a target, and grade-boundary lookup.
- **Practice**: real entry CRUD (`practiceRepository.ts`), kept structurally and visually distinct from Grades throughout.
- **Tags**: unchanged (already real since Stage 2) — now genuinely exercised by real course assignment.
- **Settings**: `notificationsEnabled` is now real, persisted `AppPreferences` state (was an in-memory stub).
- **Semester Export**: a real, self-validated JSON archive (`exportRepository.ts`) built from live repository data and downloaded — the first real consumer of the previously-unused Zod dependency (`src/domain/archive.ts`'s versioned `semesterArchiveSchema`), which also lays the schema Import will validate against later.
- **Home**: derives its "today's class"/task summary from real repository data instead of fixtures.
- **Performance**: shows real current totals (task completion, attendance, recorded grades/practice) computed from live repository data instead of fixtures; the deeper trend/correlation analytics engine remains explicitly deferred.
- **Command Palette**: real "Add course"/"Add task" quick-add actions (previously navigation-only).
- Domain modules: `scheduleGeneration.ts`, `contentValidation.ts`, `archive.ts`, plus extensions to `gradeSummary.ts`.
- Tests: 21 new/extended test files covering the new domain and repository layers plus two new form components (108 total unit/integration/component tests, up from 43); a new `e2e/workflow.spec.ts` covering the full new-user golden path and lifecycle invariants (task completion history, schedule-template edits never corrupting recorded attendance, course-rename propagation, export/new-semester independence).

### Changed

- `src/types/entities.ts`: added `StoredBlob`, `AppPreferences.notificationsEnabled`.
- `src/data/db.ts`: `SemesterDatabase` gains schema version 2 (`blobs` table).
- Every Stage 2 fixture-driven screen (Courses, Course Detail, Unit Detail, Tasks, Schedule, Grades, Practice, Home, Performance) now reads/writes real Dexie data via `dexie-react-hooks`' `useLiveQuery` instead of `src/fixtures/`.
- `e2e/helpers.ts`: `SCREEN_ROUTES` paths are now functions of real, seeded ids (`seedRepresentativeSemester`) instead of static fixture-id strings, since Stage 3 removed the fixtures those slugs pointed at.

### Removed

- `src/fixtures/` (all of it) and its two fixture-backed hooks (`useFixtureTasks`, `useFixtureSchedule`) — no fixture-only production data path remains anywhere in the app.

## [0.2.1] - 2026-07-27

Stage 2 finalization: infrastructure correction. Replaces the Netlify hosting decision — never successfully deployed, blocked on interactive login — with a permanent GitHub Pages + GitHub Actions deployment pipeline, and verifies the real production PWA. No product/UI/data-model changes.

### Removed

- Netlify entirely: `netlify.toml`, Netlify CLI permission entries, and Netlify as the documented/approved hosting provider.

### Added

- GitHub Pages deployment: a `deploy` job in `.github/workflows/ci.yml`, gated on the existing `quality` job passing on `main`, using only official GitHub actions (`configure-pages`, `upload-pages-artifact`, `deploy-pages`).
- `public/404.html` + `src/app/githubPagesRedirect.ts`: the standard GitHub Pages SPA deep-link pattern, needed because GitHub Pages (unlike Netlify) has no server-side rewrite rule; `BrowserRouter`'s clean URLs are preserved rather than switching to `HashRouter`.
- `<meta http-equiv="Content-Security-Policy">` and `<meta name="referrer">` in `index.html`, replacing the HTTP-header-based CSP/security headers `netlify.toml` used to send — GitHub Pages cannot set custom response headers at all. Documented gap: `X-Content-Type-Options`, `Permissions-Policy`, and `X-Frame-Options`/`frame-ancestors` have no static/meta equivalent and are not replicated (see `docs/SECURITY.md` §6).
- `docs/ARCHITECTURE.md` "Hosting & Deployment" section recording GitHub Pages as the permanent hosting decision.

### Changed

- `vite.config.ts`: `base` now derived from `VITE_BASE_PATH` (set only by the deploy job, itself derived from `GITHUB_REPOSITORY`), defaulting to `/` everywhere else. PWA manifest `start_url`/`scope` now derive from `base` instead of being hardcoded to `/`; manifest icon `src` values are base-relative.
- `src/App.tsx`: `BrowserRouter` now takes `basename={import.meta.env.BASE_URL}` so in-app navigation is correct under the GitHub Pages project-site subpath.
- Documentation (`README.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DEVELOPMENT.md`, `docs/ROADMAP.md`, `docs/STAGE_0_REPORT.md`, `docs/STAGE_2_REPORT.md`) updated to reflect GitHub Pages as the current, permanent hosting decision; Stage 0's original Netlify record is preserved as history with a superseded-note, not rewritten.

## [0.2.0] - 2026-07-26

Stage 2: engineering foundation, live UI system, PWA, and production pipeline. First release with actual application code — see `docs/STAGE_2_REPORT.md` for full detail.

### Added

- Project scaffold: Vite + React 19 + TypeScript (strict), ESLint (flat config, TS/React Hooks/jsx-a11y rules), Prettier.
- Design-token system implementing `docs/STAGE_1B_DESIGN_SYSTEM.md` (light/dark color palettes, typography ramp, spacing/radius/elevation/motion scales, 9 tag hues) as CSS custom properties (`src/styles/tokens.css`).
- Reusable component primitives (Button, form controls, TagChip/StatusBadge, Dialog/Sheet/ConfirmationDialog, Menu, SegmentedControl, empty/error/skeleton/offline states, Tooltip, Divider) and shared cross-feature components (`TaskRow`, `AttendanceControl`).
- Responsive application shell implementing `docs/STAGE_1A_UX_ARCHITECTURE.md`'s navigation architecture: desktop sidebar + Command Palette, mobile bottom navigation, one shared route tree.
- Live, fixture-driven reference UI covering the full Stage 1A screen inventory: Home, Tasks, Schedule (mobile Week Overview → Day Detail; desktop full week grid), Courses, Course Detail (Units/Tasks/Schedule/Grades/Practice), Unit Detail with a safe Markdown renderer for text content blocks, Add Content type-picker, Grades (Simple and Structured Mode), Practice, Performance Hub, Settings, Tags, Semester End, Start New Semester.
- Real (non-fixture) persistence: Semester Setup/lifecycle, global Tags (full CRUD), and theme/notification preferences, backed by the Dexie/IndexedDB schema from `docs/DATA_MODEL.md` (both databases, full v1 table set including `TaskCompletionEvent`).
- Domain utilities as pure, tested functions: the Saturday–Friday academic week utility, attendance presentation-state derivation (Upcoming/In-progress/Attendance-not-recorded), and grade-summary aggregation.
- PWA foundation: web app manifest, generated icon set (including a maskable variant), Workbox service worker precaching the app shell only, and a working "Update available" prompt (`registerType: "prompt"`, verified end-to-end in a real browser).
- Testing setup: Vitest + Testing Library + fake-indexeddb, 43 tests across domain logic, repositories, and components.
- CI: GitHub Actions workflow running install/typecheck/lint/format/test/build on every push/PR to `main`.
- Netlify deployment configuration (`netlify.toml`): SPA fallback, security headers (CSP, etc.), cache policy — deployment itself pending an interactive Netlify login (see `docs/STAGE_2_REPORT.md`).

### Known limitations

- Course/Unit/Task/Schedule/Grade/Practice remain reference/fixture data — no production CRUD yet (explicit Stage 3 scope).
- Mobile-width layouts were implemented and code-reviewed but not visually verified in a real narrow viewport this session (tooling limitation, documented in `docs/STAGE_2_REPORT.md`).

## [0.1.1] - 2026-07-26

### Fixed

- `docs/DATA_MODEL.md`: `TaskCompletionEvent` is now part of the planned v1 Dexie schema (Stage 2), not a deferred future addition — a single `Task.completedAt` timestamp cannot represent a task toggled Incomplete → Complete → Incomplete → Complete, and analytics/export require the full transition history.

### Added

- `LICENSE` (MIT).
- Resolved product decisions, documented across `docs/PRODUCT_SPEC.md`, `docs/DATA_MODEL.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, and `docs/ROADMAP.md`: Tags are a global/persistent taxonomy (not semester-scoped); Netlify is the approved production host; historical semesters are export-only in v1 (no in-app multi-semester browser); Text content blocks support safe Markdown-style rich formatting (parse-then-sanitize, never raw HTML); default Unit Type suggestions approved and explicitly distinguished from Schedule Event Types; repository is public under the `academic-os` name with an MIT license.
- `docs/DEVELOPMENT.md`: repo-local Git identity confirmed and documented; branch renamed from `master` to `main` to match the documented Git workflow.

### Changed

- `docs/STAGE_0_REPORT.md` and `docs/ROADMAP.md`: Stage 0 status updated from "pending review" to "reviewed and finalized."

## [0.1.0] - 2026-07-26

### Added

- Stage 0: product specification (`docs/PRODUCT_SPEC.md`).
- Stage 0: technical architecture and stack decisions (`docs/ARCHITECTURE.md`).
- Stage 0: conceptual data model and storage architecture (`docs/DATA_MODEL.md`).
- Stage 0: security and privacy threat model (`docs/SECURITY.md`).
- Stage 0: development workflow, versioning, and testing strategy (`docs/DEVELOPMENT.md`).
- Stage 0: staged implementation roadmap (`docs/ROADMAP.md`).
- Stage 0: implementation report (`docs/STAGE_0_REPORT.md`).
- Repository initialized with `.gitignore` and this changelog.

No application code, UI, or backend was introduced in this release — Stage 0 is documentation and repository foundation only.
