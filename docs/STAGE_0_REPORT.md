# Stage 0 Report — Specification & Architecture

> **Superseded note (Stage 2 finalization):** this report's hosting decision below (Netlify) was the Stage 0 choice and is preserved here as the historical record — it is **no longer current**. Netlify was tried during Stage 2, never successfully deployed (blocked on interactive login), and has been fully removed. **GitHub Pages is now the permanent hosting decision** — see [ARCHITECTURE.md](./ARCHITECTURE.md#hosting--deployment) and [STAGE_2_REPORT.md](./STAGE_2_REPORT.md).

**Status: reviewed and finalized by the product owner.** This report was updated in a Stage 0 *finalization* pass that resolved the open questions from the initial draft, fixed a data-model inconsistency, added the repository license, and connected the GitHub remote. Stage 0 remains documentation/architecture only — no application code was introduced. **Stage 1 has not started.**

## Summary

Stage 0 established the product specification, technical architecture, conceptual data model, storage/security/testing strategy, and a professional documentation structure for Academic OS, and initialized the Git repository. A subsequent finalization pass resolved all outstanding product-owner decisions (tag scope, license/visibility, hosting, historical-semester scope, rich text, default unit types), fixed a Task-completion-history inconsistency in the data model, added the MIT license, renamed the default branch to `main`, and pushed the repository to GitHub. No application code, UI, or backend was built — per the Stage 0 brief, this stage is planning and foundation only.

## Repository State

**Before:** an empty directory (`Academic-os`), not a Git repository, no files.

**Created:**
- `.git/` — repository initialized (`git init`), no prior history existed.
- `.gitignore` — covers dependencies, build output, env/secrets, editor/OS artifacts, test/coverage output, PWA-generated files, and user academic data/exports (never to be committed).
- `README.md` — project overview and documentation entry point.
- `CHANGELOG.md` — Keep a Changelog format, seeded with the `0.1.0` Stage 0 entry.
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/SECURITY.md`
- `docs/DEVELOPMENT.md`
- `docs/ROADMAP.md`
- `docs/STAGE_0_REPORT.md` (this file)

No `package.json`, `src/`, or build tooling was created — see "Deferred Work" below for why.

**Finalization pass additionally created/changed:**
- `LICENSE` (MIT, public repository).
- Updates to `PRODUCT_SPEC.md`, `DATA_MODEL.md`, `ARCHITECTURE.md`, `SECURITY.md`, `ROADMAP.md`, `README.md`, `CHANGELOG.md` to resolve open questions and fix the Task-completion-history inconsistency (see below).
- Local default branch renamed `master` → `main`.
- GitHub remote `origin` connected and pushed — see "Git & Deployment" and the final report for exact identifiers.

## Architecture Decision

TypeScript + React + Vite, with Dexie.js over IndexedDB for structured/blob storage, Zod for validation (forms and untrusted archive import), Dexie live queries + React Context for state (no Redux/Zustand — avoids a redundant cache layer over IndexedDB), `vite-plugin-pwa`/Workbox for PWA/service-worker concerns, JSZip for archive/media export, Recharts for future analytics charts, and Vitest + React Testing Library + `fake-indexeddb` + (later) Playwright for testing. Full rationale and alternatives considered are in [ARCHITECTURE.md](./ARCHITECTURE.md). **Hosting: Netlify — approved** (no longer an open question).

## Storage Decision

Two Dexie/IndexedDB databases: `academic-os-preferences` (survives semester resets: `AppPreferences` **and the global, persistent `Tag` table**) and `academic-os-semester` (the single active semester workspace: courses, units, content blocks, tasks, `TaskCompletionEvent`, schedule, grades, practice, check-ins). Large binary content (files/images/video) is stored as `Blob`s in a dedicated table separate from content-block metadata, so list views never load binary payloads. `localStorage` was explicitly rejected as inadequate (synchronous, string-only, ~5–10MB cap). Because Tag now lives in a different database than Course, `Course.tagIds` is a cross-database reference resolved at the application layer, not enforced by IndexedDB — see DATA_MODEL.md §"Cross-database references are not enforceable at the database layer." Full detail, including quota/eviction handling and migration strategy, is in [DATA_MODEL.md](./DATA_MODEL.md).

## Task Completion History — Fix Applied

**Problem identified:** the original DATA_MODEL.md treated `TaskCompletionEvent` as an optional future addition, relying on `Task.completed`/`Task.completedAt` alone. That pair cannot represent a task toggled Incomplete → Complete → Incomplete → Complete, since a single `completedAt` timestamp is overwritten on each transition and earlier history is lost — yet PRODUCT_SPEC.md already required full historical completion data for analytics and export.

**Fix:** `TaskCompletionEvent` (`id`, `taskId`, `toggledTo: boolean`, `at`) is now part of the v1 data model, built in the initial Dexie schema in Stage 2, not deferred. `Task.completed`/`Task.completedAt` remain as derived current-state fields for cheap list queries; `completedAt` is set on transition to complete and cleared to `null`/`undefined` on transition back to incomplete, while `TaskCompletionEvent` permanently retains every transition regardless of what the `Task` row currently shows. Deleting a Task cascades to delete its `TaskCompletionEvent` rows (consistent with the existing Course/Unit → Task cascade pattern). Semester Export now explicitly includes `taskCompletionEvents` as raw analytics source data. Full detail in DATA_MODEL.md §TaskCompletionEvent.

## Security

Key threats identified and mitigations planned: XSS via user-entered text (never `dangerouslySetInnerHTML`; scheme-validate any rendered links), **XSS via rich-text notes specifically** (Text content blocks now support safe Markdown-style formatting — approved — rendered via parse-then-sanitize, e.g. an AST-to-React renderer or a sanitizer like DOMPurify, never raw HTML passthrough), unsafe/unvalidated file intake (MIME/size validation, opaque Blob storage, no execution of uploaded content), malicious/corrupted import archives (treated as fully untrusted — versioned Zod schema validation, size limits, allow-listed field copying to avoid prototype pollution, rejection of unknown archive versions), dependency/supply-chain risk (small dependency count, committed lockfile, `npm audit` + Dependabot in CI), service-worker risk (prompt-based update flow so a bad deploy can only serve a stale UI, never corrupt data, since the SW never touches IndexedDB), and destructive-operation safety (explicit confirmation for semester clear, fully independent from export). No accounts/backend means no credential or server-side attack surface exists in this architecture. Full detail in [SECURITY.md](./SECURITY.md).

## PWA Strategy

Installable, standalone-display manifest with maskable icons; Workbox-generated service worker precaching only the static app shell (never user data, which lives in IndexedDB outside the SW cache); `registerType: "prompt"` update flow so version swaps are explicit and never interrupt in-progress data entry. Platform differences are documented rather than assumed uniform — notably, iOS Safari lacks an install-prompt API and has materially weaker background/notification support than desktop Chrome/Edge or Android Chrome. True OS-level background class reminders are documented as **not achievable without a push-capable backend**, which conflicts with the local-first requirement — the planned mitigation is in-app/foregrounded reminders only, explicitly disclosed as such to the user. Full detail in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Testing Strategy

Vitest for unit tests of pure domain logic (grade math, the Saturday–Friday week utility, attendance percentage, archive validators); Vitest + `fake-indexeddb` for Dexie repository-layer tests without a browser; React Testing Library for critical UI flows once built; dedicated export→import round-trip tests; Playwright introduced for E2E/offline/PWA-install smoke tests once a real deployed app exists. CI runs typecheck/lint/unit/integration tests on every push/PR. Full detail in [DEVELOPMENT.md](./DEVELOPMENT.md).

## Git & Deployment

Single `main` branch as the production branch (renamed from the initial `master` during finalization to match documented convention and the GitHub default), short-lived intent-named feature branches, PRs even for solo work (as a CI checkpoint), squash-merge, SemVer tags. Pre-1.0 versioning throughout Stages 0–6; `1.0.0` reserved for the end of Stage 7. Deployment: GitHub Actions runs checks; the static host (**Netlify — approved**) auto-deploys `main` to a stable production URL and generates PR preview deployments, with atomic-deploy rollback available via the host. Actual Netlify configuration remains Stage 2 work. Full detail in [DEVELOPMENT.md](./DEVELOPMENT.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

The repository is connected to GitHub as `origin` → `omar-issam-abdelhalim/academic-os` (public), with `main` pushed and tracking `origin/main`. See the finalization commit details reported to the product owner at the end of this session for exact commit hashes.

## Files Created/Changed

**Initial Stage 0 commit:**
```
.git/                       (repository initialized)
.gitignore                  (new)
README.md                   (new)
CHANGELOG.md                (new)
docs/PRODUCT_SPEC.md        (new)
docs/ARCHITECTURE.md        (new)
docs/DATA_MODEL.md          (new)
docs/SECURITY.md            (new)
docs/DEVELOPMENT.md         (new)
docs/ROADMAP.md             (new)
docs/STAGE_0_REPORT.md      (new)
```

**Stage 0 finalization commit:**
```
LICENSE                     (new — MIT)
README.md                   (changed — status, license, principle)
CHANGELOG.md                (changed — 0.1.1 entry)
docs/PRODUCT_SPEC.md        (changed — tag scope, task history, rich text, unit/schedule-type note, historical semesters, invariants)
docs/ARCHITECTURE.md        (changed — hosting resolved, resolved-questions note)
docs/DATA_MODEL.md          (changed — TaskCompletionEvent, Tag persistence/cross-DB references, historical-semester note, deletion rules)
docs/SECURITY.md            (changed — rich-text sanitization requirement, hosting wording)
docs/ROADMAP.md             (changed — Stage 0 status, Stage 2/3 wording)
docs/STAGE_0_REPORT.md      (changed — this file, finalized)
```

## Decisions Made

1. React + TypeScript + Vite as the application stack (see ARCHITECTURE.md table for full rationale vs. alternatives).
2. Dexie.js over raw IndexedDB, PouchDB, or WASM SQLite for structured storage.
3. Blobs stored in IndexedDB (dedicated Dexie table) rather than requiring the File System Access API, which isn't cross-platform.
4. No global state library — Dexie live queries + React Context is sufficient given data already lives reactively in IndexedDB.
5. Two separate IndexedDB databases (preferences vs. semester workspace) specifically so "Clear Semester" cannot accidentally wipe app preferences.
6. Schedule modeled as Template + on-demand-generated, snapshot-denormalized Occurrence, so template edits/deletions never corrupt historical attendance.
7. Grades modeled as one `GradeEntry` shape (optionally categorized) so Simple Mode and Structured Mode are the same underlying model, not two incompatible ones.
8. `vite-plugin-pwa` with `registerType: "prompt"` rather than silent auto-update.
9. Notifications: documented as in-app/foregrounded-only for v1; true background OS notifications explicitly deferred as out of scope because it would require a backend.
10. **(Finalized)** Netlify approved as the production hosting provider — no longer a recommendation, a decision.
11. Stage 0 deliberately does **not** scaffold `package.json`/build tooling — that is Stage 2's named responsibility ("Engineering Foundation"), and creating it now risked drifting into implementation, which the brief explicitly prohibits for Stage 0.
12. **(Finalized)** Tags are a global, persistent taxonomy stored in `academic-os-preferences`, surviving "Start New Semester"; only a course's tag association is semester-scoped. Cross-database references (`Course.tagIds` → `Tag.id`) are resolved at the application layer, never as a database-level foreign key.
13. **(Finalized)** `TaskCompletionEvent` is part of the v1 data model (Stage 2 initial schema), not a deferred addition — see "Task Completion History — Fix Applied" above.
14. **(Finalized)** Repository is public, named `academic-os`, owned by `omar-issam-abdelhalim`, licensed MIT.
15. **(Finalized)** No in-app multi-semester history browser in v1 — history is export-only; import is the sole path back into the active workspace.
16. **(Finalized)** Text content blocks support safe Markdown-style rich formatting (headings, bold/italic, lists, links, inline/code), rendered via parse-then-sanitize; no specific library chosen yet (Stage 3 decision).
17. **(Finalized)** Default Unit Type suggestions (Lecture, Tutorial, Section, Lab, Video, Chapter, Assignment, Workshop) approved as non-exhaustive convenience defaults; explicitly documented as independent from Schedule Event Types despite overlapping vocabulary.

## Open Questions

All open questions from the initial Stage 0 draft (tag scope, license/visibility, hosting provider, historical-semester browsing, rich text vs. plain text, default unit types) were resolved by the product owner in this finalization pass — see "Decisions Made" #10, #12, #14, #15, #16, #17 above. **No further open questions were identified during this finalization review.** If a genuinely new open question surfaces during Stage 1, it will be added here rather than decided silently.

## Deferred Work (intentionally not done in Stage 0)

- No `package.json`, dependency installation, or build tooling (Stage 2).
- No actual Dexie schema/code, no repository layer, no domain logic implementation (Stage 2+).
- No UI/UX design or component implementation (Stage 1, then Stage 3+).
- No service worker/manifest files (Stage 2).
- No CI pipeline configuration (Stage 2).
- No actual hosting/deployment setup (Stage 2).
- No notification implementation (Stage 4, with permanent platform limitations documented in ARCHITECTURE.md).
- No grade calculation, analytics, or export/import code (Stages 5–7).
- No specific Markdown/rich-text editor or sanitizer library chosen (Stage 3 implementation decision, constrained by the safety requirements in SECURITY.md §1).
- No Netlify project/site was created or configured (Stage 2); only the documentation decision was finalized.

## Stage 1 Readiness

**The project is ready for the Stage 1 UI/UX design stage — Stage 1 has not started and will not begin without explicit product-owner approval.** The designer should read, in order: `docs/PRODUCT_SPEC.md` (especially §22's list of required screens/areas, the note on rich-text content blocks, and the Cross-Cutting Invariants at the end), `docs/DATA_MODEL.md` (to understand what data each screen actually has available — e.g. that Grades and Practice are separate, that a Task may or may not belong to a Unit, that Tags are global/persistent while their course associations are not, that Attendance has three states with Cancelled excluded from the percentage), and the notification/PWA platform-limitation notes in `docs/ARCHITECTURE.md` (so the design doesn't promise a background-notification experience the platform can't deliver). All open questions from the initial draft are resolved; there is nothing outstanding that should block Stage 1 from starting once approved.
