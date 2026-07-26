# Changelog

All notable changes to this project are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows [Semantic Versioning](https://semver.org/) and is pre-1.0 during development (see `docs/DEVELOPMENT.md` §Versioning).

## [Unreleased]

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
