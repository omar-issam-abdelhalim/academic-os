# Stage 0 Report — Specification & Architecture

## Summary

Stage 0 established the product specification, technical architecture, conceptual data model, storage/security/testing strategy, and a professional documentation structure for Academic OS, and initialized the Git repository. No application code, UI, or backend was built — per the Stage 0 brief, this stage is planning and foundation only.

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

## Architecture Decision

TypeScript + React + Vite, with Dexie.js over IndexedDB for structured/blob storage, Zod for validation (forms and untrusted archive import), Dexie live queries + React Context for state (no Redux/Zustand — avoids a redundant cache layer over IndexedDB), `vite-plugin-pwa`/Workbox for PWA/service-worker concerns, JSZip for archive/media export, Recharts for future analytics charts, and Vitest + React Testing Library + `fake-indexeddb` + (later) Playwright for testing. Full rationale and alternatives considered are in [ARCHITECTURE.md](./ARCHITECTURE.md). Hosting recommendation: Netlify (Vercel/Cloudflare Pages are equally valid — flagged as an open question).

## Storage Decision

Two Dexie/IndexedDB databases: `academic-os-preferences` (survives semester resets: theme, notification settings) and `academic-os-semester` (the single active semester workspace: courses, units, content blocks, tasks, schedule, grades, practice, check-ins). Large binary content (files/images/video) is stored as `Blob`s in a dedicated table separate from content-block metadata, so list views never load binary payloads. `localStorage` was explicitly rejected as inadequate (synchronous, string-only, ~5–10MB cap). Full detail, including quota/eviction handling and migration strategy, is in [DATA_MODEL.md](./DATA_MODEL.md).

## Security

Key threats identified and mitigations planned: XSS via user-entered text (never `dangerouslySetInnerHTML`; scheme-validate any rendered links), unsafe/unvalidated file intake (MIME/size validation, opaque Blob storage, no execution of uploaded content), malicious/corrupted import archives (treated as fully untrusted — versioned Zod schema validation, size limits, allow-listed field copying to avoid prototype pollution, rejection of unknown archive versions), dependency/supply-chain risk (small dependency count, committed lockfile, `npm audit` + Dependabot in CI), service-worker risk (prompt-based update flow so a bad deploy can only serve a stale UI, never corrupt data, since the SW never touches IndexedDB), and destructive-operation safety (explicit confirmation for semester clear, fully independent from export). No accounts/backend means no credential or server-side attack surface exists in this architecture. Full detail in [SECURITY.md](./SECURITY.md).

## PWA Strategy

Installable, standalone-display manifest with maskable icons; Workbox-generated service worker precaching only the static app shell (never user data, which lives in IndexedDB outside the SW cache); `registerType: "prompt"` update flow so version swaps are explicit and never interrupt in-progress data entry. Platform differences are documented rather than assumed uniform — notably, iOS Safari lacks an install-prompt API and has materially weaker background/notification support than desktop Chrome/Edge or Android Chrome. True OS-level background class reminders are documented as **not achievable without a push-capable backend**, which conflicts with the local-first requirement — the planned mitigation is in-app/foregrounded reminders only, explicitly disclosed as such to the user. Full detail in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Testing Strategy

Vitest for unit tests of pure domain logic (grade math, the Saturday–Friday week utility, attendance percentage, archive validators); Vitest + `fake-indexeddb` for Dexie repository-layer tests without a browser; React Testing Library for critical UI flows once built; dedicated export→import round-trip tests; Playwright introduced for E2E/offline/PWA-install smoke tests once a real deployed app exists. CI runs typecheck/lint/unit/integration tests on every push/PR. Full detail in [DEVELOPMENT.md](./DEVELOPMENT.md).

## Git & Deployment

Single `main` branch as the production branch, short-lived intent-named feature branches, PRs even for solo work (as a CI checkpoint), squash-merge, SemVer tags. Pre-1.0 versioning throughout Stages 0–6; `1.0.0` reserved for the end of Stage 7. Recommended deployment: GitHub Actions runs checks; the static host (Netlify recommended) auto-deploys `main` to a stable production URL and generates PR preview deployments, with atomic-deploy rollback available via the host. Full detail in [DEVELOPMENT.md](./DEVELOPMENT.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

## Files Created/Changed

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
docs/STAGE_0_REPORT.md      (new, this file)
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
10. Netlify recommended as the default hosting choice, with Vercel/Cloudflare Pages as accepted equivalents pending the product owner's preference.
11. Stage 0 deliberately does **not** scaffold `package.json`/build tooling — that is Stage 2's named responsibility ("Engineering Foundation"), and creating it now risked drifting into implementation, which the brief explicitly prohibits for Stage 0.

## Open Questions (require product-owner input)

1. **Tag scope** — should Tags be a personal taxonomy that persists across semesters (global), or reset with each new semester workspace (current default assumption in DATA_MODEL.md)? This affects whether Tags live in the preferences DB or the semester DB.
2. **License & repository visibility** — no LICENSE file was added. Should this be public (e.g. MIT, as a portfolio piece) or private/all-rights-reserved? This also determines whether the GitHub repo should be public or private.
3. **Hosting provider** — Netlify is recommended, but if there's an existing Vercel/Cloudflare/other account or preference, say so before Stage 2 wires up deployment.
4. **In-app historical semester browsing** — v1 scope assumes only the *active* semester is browsable in-app, with history preserved solely via export. Confirm this is acceptable, or whether browsing past exported semesters inside the app is wanted sooner than "later, maybe."
5. **Rich text in notes** — should text content blocks eventually support markdown/rich formatting, or is plain text sufficient? This affects the Stage 1 design and the sanitization approach documented in SECURITY.md.
6. **Default unit/event type lists** — the suggested defaults (Lecture, Tutorial, Section, Lab, Video, Chapter, Assignment, Workshop) are a starting proposal for Stage 1's designer to refine, not a final list.

## Deferred Work (intentionally not done in Stage 0)

- No `package.json`, dependency installation, or build tooling (Stage 2).
- No actual Dexie schema/code, no repository layer, no domain logic implementation (Stage 2+).
- No UI/UX design or component implementation (Stage 1, then Stage 3+).
- No service worker/manifest files (Stage 2).
- No CI pipeline configuration (Stage 2).
- No actual hosting/deployment setup (Stage 2).
- No notification implementation (Stage 4, with permanent platform limitations documented in ARCHITECTURE.md).
- No grade calculation, analytics, or export/import code (Stages 5–7).
- No LICENSE file (open question above).

## Stage 1 Readiness

The project is ready for the Stage 1 UI/UX design stage. The designer should read, in order: `docs/PRODUCT_SPEC.md` (especially §22's list of required screens/areas and the Cross-Cutting Invariants at the end), `docs/DATA_MODEL.md` (to understand what data each screen actually has available — e.g. that Grades and Practice are separate, that a Task may or may not belong to a Unit, that Attendance has three states with Cancelled excluded from the percentage), and the notification/PWA platform-limitation notes in `docs/ARCHITECTURE.md` (so the design doesn't promise a background-notification experience the platform can't deliver). Open Questions #4–#6 above are particularly relevant to Stage 1 and should ideally be resolved before or during that stage rather than left implicit in the designs.
