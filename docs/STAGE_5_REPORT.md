# Stage 5 Report — Import, Media Export, Notifications, Security Hardening & v1.0.0

> **Status: complete — released as `v1.0.0`.** "Stage 5" is this project's internal execution count; it corresponds to `docs/ROADMAP.md`'s **Stage 7** (Import, Media Export, Security Hardening & Production v1.0.0), the closing stage of the original roadmap. Stages 3 and 4 had already absorbed the roadmap's original Stages 3–6 (see `docs/ROADMAP.md`), which is why the internal count is lower.

## 1. Objective

Close the original roadmap: make semester archives importable as well as exportable, add an optional media export, ship a notification baseline, harden the security posture, run an accessibility pass, and cut the first production release.

## 2. What shipped

| Area | Implementation | Key properties |
|---|---|---|
| **Import** | `src/domain/archiveImport.ts`, `src/data/repositories/importRepository.ts`, `src/features/semester/ImportSemesterScreen.tsx` | Archive treated as untrusted input: defensive `JSON.parse`, a specific rejection reason for a too-new/too-old `archiveVersion` before schema validation, the same versioned Zod schema Export validates against, a 50 MB limit, allow-listed field-by-field record construction (never a spread of parsed JSON). Flow: warn → preview → explicit confirmation, with "export first" recommended. Tags are inserted only if missing locally and never overwrite a renamed local tag. |
| **Media Export** | `src/domain/mediaExport.ts`, `src/data/repositories/mediaExportRepository.ts` | Optional zip of personal images only (never `file`/`video` blocks or course materials), organized `Course/Unit/filename` with per-folder de-duplication. Versioned independently from the semester archive. New dependency: JSZip (pre-approved in `ARCHITECTURE.md`). |
| **Notifications** | `src/domain/notifications.ts`, `src/features/shared/useClassReminders.ts`, `src/app/ClassReminderBanner.tsx` | Tier 1: in-app, dismissible "class starting soon" banner (rechecked on mount, window focus and a 30 s poll). Tier 2: best-effort `Notification` scheduling while the tab is open, only after permission is granted from the Settings toggle — never auto-prompted. Tier 3 (background push) is out of scope. |
| **Security** | `.github/dependabot.yml`, CI `npm audit --audit-level=critical` | Weekly dependency update PRs; CI fails on critical advisories. `SECURITY.md` records one consciously accepted advisory (a React Router server-side issue that does not apply to this client-only SPA) and reconfirms the documented CSP `frame-ancestors` limitation of meta-delivered CSP. |
| **Accessibility** | Live regions (`role="alert"` / `role="status"`) for Import/Export results | The Import screen and reminder banner follow the existing keyboard, focus, touch-target and no-color-only conventions, and are covered by the axe-core spot checks. |

Schema change: `scheduleTemplateSchema.dayOfWeek` now requires an integer, because the archive schema is now a real untrusted-input boundary. `TagColor` is derived from a runtime `TAG_COLORS` array so Import validation and the Tags palette share one source of truth. **No IndexedDB schema migration** — existing local data is untouched by this release.

## 3. Tests added

- Unit/integration (Vitest): `archiveImport.test.ts`, `importRepository.test.ts`, `mediaExport.test.ts`, `notifications.test.ts`, `useClassReminders.test.tsx` — 34 new tests (domain rules plus real-Dexie integration via `fake-indexeddb`).
- End-to-end (Playwright): export → import round-trip reproducing the same data, malformed-archive rejection leaving the current semester untouched, and the Import screen added to the responsive and axe-core suites.

## 4. Verification results

Run against the release commit before merge:

| Gate | Result |
|---|---|
| `npm audit --audit-level=critical` | pass |
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 problems) |
| `npm run format:check` | pass |
| `npm test` (Vitest) | **198 / 198** passed, 34 files |
| `npm run build` | pass (PWA service worker generated) |
| `npm run test:e2e` (Playwright, Chromium) | **168 / 168** passed |

The same gates run again in GitHub Actions on merge to `main`, which then deploys to GitHub Pages.

## 5. Known limitations

- Imported `file`/`image`/`video` content blocks show metadata only: their binary data is never part of the archive (by design, `PRODUCT_SPEC.md` §16), so no preview/download is available after import.
- The reminder lead time is a fixed 10 minutes; configurable timing is future work (`PRODUCT_SPEC.md` §9).
- Weekly Check-in (`WeeklyCheckIn` table) still has no repository or UI; it was outside this stage's scope.

## 6. Final decision

All roadmap stages are complete and every gate passes. Released as **`v1.0.0`**; standard Semantic Versioning applies from here on (`docs/DEVELOPMENT.md` §Versioning).
