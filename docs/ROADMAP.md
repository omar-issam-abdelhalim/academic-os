# Roadmap — Academic OS

> Staged implementation plan. Each stage should end with a short report (as this one does — see [STAGE_0_REPORT.md](./STAGE_0_REPORT.md)) documenting what shipped, decisions made, and what's deferred. Stages are not collapsed into one another; each stage's deliverables should be genuinely reviewable before the next begins.

## Stage 0 — Specification & Architecture
Product specification, technical architecture, conceptual data model, storage/PWA/security/testing strategy, documentation structure, Git repository initialization. No feature code, no UI, no backend. **Status: reviewed and finalized/approved by the product owner** (see docs/STAGE_0_REPORT.md). Stage 1 has not started.

## Stage 1 — UI/UX & Figma
**Stage 1A — Information Architecture & UX Flows: APPROVED** (`docs/STAGE_1A_UX_ARCHITECTURE.md`). Full navigation architecture, screen inventory, sitemap, and all major user flows are settled and are the authoritative UX reference for implementation.

**Stage 1B — Visual Design System: partially completed, execution decision approved.** `docs/STAGE_1B_DESIGN_SYSTEM.md` establishes an approved visual foundation — typography ramp, color tokens (light + dark), spacing/radius/elevation/motion scales, iconography strategy, and breakpoints — built in Figma through Phase B (Foundations). Full Figma component and screen production (Phases C–H: ~component library and 22 reference screens with states) was **not completed**, because the connected Figma workspace's Starter-plan tier hit real tooling constraints (a 3-page limit, single-mode variable collections, and an MCP tool-call rate limit) partway through Phase B, documented plainly in that file's §0 rather than glossed over.

**Decision (approved by the product owner, applied starting Stage 2):** rather than blocking implementation on further Figma tooling work, the project moved to **direct implementation** for everything Figma did not reach — components, screens, and states are built in code against the approved Stage 1A UX architecture and the approved Stage 1B foundations (tokens), not against additional Figma mockups. Within those two approved documents, the implementer (Claude Code, in Stage 2 onward) may make ordinary implementation-level visual decisions — exact layout composition, spacing application, component arrangement, card-vs-non-card grouping where Stage 1B doesn't specify — the same kind of judgment call any frontend engineer makes translating an approved design system into screens. This does **not** extend to product behavior, navigation architecture, data invariants, or security requirements, which remain governed exclusively by PRODUCT_SPEC.md, DATA_MODEL.md, ARCHITECTURE.md, and SECURITY.md, and were not and cannot be altered for visual convenience.

If Figma work resumes later (e.g. on a paid tier that removes the Starter-plan constraints), it would inform *future* refinement, not retroactively invalidate what's implemented from this decision.

## Stage 2 — Engineering Foundation, Live UI System, PWA & Production Pipeline
Actual project scaffold: `package.json`, Vite + React + TypeScript setup, ESLint/Prettier, Dexie schema (v1) implementing DATA_MODEL.md — including the `academic-os-preferences`/`academic-os-semester` database split and the `TaskCompletionEvent` log from day one — a full responsive component/design-token system implementing STAGE_1B_DESIGN_SYSTEM.md, a live fixture-driven reference UI covering the STAGE_1A_UX_ARCHITECTURE.md screen inventory, `vite-plugin-pwa` manifest/service-worker wiring with a real update-prompt flow, testing setup (Vitest + Testing Library + fake-indexeddb), and CI/CD (GitHub Actions: typecheck/lint/format/test/build/E2E, deploying to **GitHub Pages** — the permanent hosting decision; Netlify was tried and removed after proving blocked on interactive login, see ARCHITECTURE.md's Hosting & Deployment section). This is where ARCHITECTURE.md's and the Stage 1 design's decisions become real code. **Status: complete — see `docs/STAGE_2_REPORT.md`.**

## Stage 3 — Courses, Units, Content, Schedule, Tasks, Attendance, Grades, Practice & Semester Export (redefined scope — see note below)
**Status: complete — see `docs/STAGE_3_REPORT.md`.** Real, persisted CRUD replacing every Stage 2 fixture: Courses (incl. per-course Tag assignment), Units, Content Blocks (Markdown text via the existing safe parse-then-sanitize renderer, plus real file/image/video Blob upload/storage), the weekly Schedule engine (Templates + lazily-generated, snapshot-denormalized Occurrences, preserving historical attendance across template edits), the central Task system with full `TaskCompletionEvent` history, Attendance marking, Official Grades (Simple + Structured modes, plus the grade-calculation domain layer — current performance, remaining points, max possible final, required score, boundary lookup), Practice Performance (kept structurally distinct from Grades throughout), a real Semester Export (self-validated JSON archive via a versioned Zod schema), and a real Command Palette quick-add. Cross-feature consistency (renaming a course, completing a task, marking attendance, editing a schedule template) was verified end-to-end. Home and Performance now derive from real repository data instead of fixtures. `src/fixtures/` was removed entirely — no fixture-only production path remains.

> **Scope note (documented, not silently improvised):** the product owner's Stage 3 task prompt redefined "Stage 3" to include everything below that was previously split across this roadmap's original Stage 3 (Courses/Units/Content), Stage 4 (Schedule/Tasks/Attendance — notifications excluded, see below), Stage 5 (Grades/Practice), and the Semester Export portion of the original Stage 7 (PRODUCT_SPEC.md §16, which was never marked "future" the way Import and Media Export are). This roadmap is updated to reflect that as the actual, approved scope of the work completed under the "Stage 3" name — the original finer-grained staging below is preserved as a historical record of the original plan, not as a claim that four separate stages shipped independently.
>
> Explicitly **not** included in this redefined Stage 3, and pending at the time: the in-app-open Notification baseline (part of the original Stage 4 — no scheduling UI beyond the real `notificationsEnabled` preference toggle), the Analytics/Semester-Intelligence engine (original Stage 6 — Performance showed real current totals only, not trends/correlation insights; **since delivered, see the "Stage 4 (continued)" entry below**), and Import/Media Export/"New Semester" security hardening/dependency audit/`1.0.0` (the remainder of the original Stage 7 — "Start New Semester" itself was already real since Stage 2). See `docs/STAGE_3_REPORT.md` for the full accounting.

<details>
<summary>Original Stage 3–5 plan (superseded by the redefinition above — kept for historical record)</summary>

### Stage 3 — Courses, Units & Content Blocks (original scope)
Full CRUD for Courses, global Tags and their per-course associations, Units, and Content Blocks (rich-text/Markdown, file, image, video), including reordering, per PRODUCT_SPEC.md §2–5. Includes selecting and wiring the Markdown parser/sanitizer for Text blocks per the safety requirements in SECURITY.md §1. Built against the Stage 1 design.

### Stage 4 — Schedule, Tasks, Attendance & Notifications (original scope)
Weekly schedule (templates), the central Task system (Overdue/Today/Upcoming, using the shared academic-week utility), attendance marking against schedule occurrences, and the in-app-open notification baseline described in ARCHITECTURE.md §"Notifications — platform constraints."

### Stage 5 — Official Grades & Practice Performance (original scope)
Simple and Structured grading modes, grade categories/boundaries, grade calculations (current performance, required scores, etc.), and Practice Performance kept structurally distinct throughout.

</details>

## Stage 4 (continued) — Analytics, Trends & Actionable Intelligence
**Status: complete — see `docs/STAGE_4_REPORT.md`.** A second product-owner task prompt further redefined scope: the original Stage 6 (Analytics & Semester Intelligence) was pulled forward and delivered as part of "Stage 4," on top of Stage 3's real persistence. Deterministic (never AI/LLM-generated) task/attendance/grade/practice analytics, weighted semester aggregation, trend classification (improving/declining/stable/insufficient-data) with documented thresholds, and an explainable insight engine — all computed client-side from real Stage 3 data, with correlation-only, never-causal framing throughout (PRODUCT_SPEC.md §13). Performance Hub was rebuilt into the real analytics dashboard the original Stage 6 entry below describes; Home gained exactly the one plain-text insight line STAGE_1A_UX_ARCHITECTURE.md §G already allowed, never a chart or widget; Course Detail gained a link into the Performance Hub's course filter rather than a dedicated analytics tab (§H already ruled that out for v1).

<details>
<summary>Original Stage 6 plan (delivered under the "Stage 4" name above — kept for historical record)</summary>

### Stage 6 — Analytics & Semester Intelligence (original scope)
Dashboards over the raw data accumulated by Stage 3: task completion, attendance, practice, grades, weekly/semester trends, strongest/weakest units, and correlation-only (never causal) insight copy, per PRODUCT_SPEC.md §13.

</details>

## Stage 7 — Import, Media Export, Security Hardening & Production v1.0.0
**Status: complete — see `docs/STAGE_5_REPORT.md`** (named "Stage 5" there, this project's internal execution count — see that report's opening section for the explicit stage-numbering mapping back to this document). Semester archive **Import** (full untrusted-input validation per SECURITY.md — consuming the archive schema and export-time self-validation that already existed from Stage 3), a separate **Media Export**, a real **Notification engine baseline** (in-app "starting soon" reminders plus best-effort local `Notification` scheduling — the item originally scoped to Stage 4 and explicitly deferred at that time), CSP/dependency-audit hardening, a full accessibility pass, and the first `1.0.0` production release. (Semester **Export** and "Start New Semester" were already real — delivered in Stage 3 and Stage 2 respectively — and required no rework here.)

---

Stage boundaries may be refined slightly if a concrete technical reason emerges during a stage (e.g. discovering PWA notification work is better split across Stage 4 and a later stage) — but stages are not to be merged wholesale to save time; each is meant to produce a genuinely reviewable increment. Stage 3's and Stage 4's redefinitions above are the two documented exceptions, both made explicitly by the product owner's own task prompts rather than an implementer's unilateral choice.
