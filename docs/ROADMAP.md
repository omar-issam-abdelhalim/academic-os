# Roadmap — Academic OS

> Staged implementation plan. Each stage should end with a short report (as this one does — see [STAGE_0_REPORT.md](./STAGE_0_REPORT.md)) documenting what shipped, decisions made, and what's deferred. Stages are not collapsed into one another; each stage's deliverables should be genuinely reviewable before the next begins.

## Stage 0 — Specification & Architecture
Product specification, technical architecture, conceptual data model, storage/PWA/security/testing strategy, documentation structure, Git repository initialization. No feature code, no UI, no backend. **Status: reviewed and finalized/approved by the product owner** (see docs/STAGE_0_REPORT.md). Stage 1 has not started.

## Stage 1 — UI/UX & Figma
**Stage 1A — Information Architecture & UX Flows: APPROVED** (`docs/STAGE_1A_UX_ARCHITECTURE.md`). Full navigation architecture, screen inventory, sitemap, and all major user flows are settled and are the authoritative UX reference for implementation.

**Stage 1B — Visual Design System: partially completed, execution decision approved.** `docs/STAGE_1B_DESIGN_SYSTEM.md` establishes an approved visual foundation — typography ramp, color tokens (light + dark), spacing/radius/elevation/motion scales, iconography strategy, and breakpoints — built in Figma through Phase B (Foundations). Full Figma component and screen production (Phases C–H: ~component library and 22 reference screens with states) was **not completed**, because the connected Figma workspace's Starter-plan tier hit real tooling constraints (a 3-page limit, single-mode variable collections, and an MCP tool-call rate limit) partway through Phase B, documented plainly in that file's §0 rather than glossed over.

**Decision (approved by the product owner, applied starting Stage 2):** rather than blocking implementation on further Figma tooling work, the project moved to **direct implementation** for everything Figma did not reach — components, screens, and states are built in code against the approved Stage 1A UX architecture and the approved Stage 1B foundations (tokens), not against additional Figma mockups. Within those two approved documents, the implementer (Claude Code, in Stage 2 onward) may make ordinary implementation-level visual decisions — exact layout composition, spacing application, component arrangement, card-vs-non-card grouping where Stage 1B doesn't specify — the same kind of judgment call any frontend engineer makes translating an approved design system into screens. This does **not** extend to product behavior, navigation architecture, data invariants, or security requirements, which remain governed exclusively by PRODUCT_SPEC.md, DATA_MODEL.md, ARCHITECTURE.md, and SECURITY.md, and were not and cannot be altered for visual convenience.

If Figma work resumes later (e.g. on a paid tier that removes the Starter-plan constraints), it would inform *future* refinement, not retroactively invalidate what's implemented from this decision.

## Stage 2 — Engineering Foundation, Local Storage, PWA & Deployment Foundation
Actual project scaffold: `package.json`, Vite + React + TypeScript setup, ESLint/Prettier, Dexie schema (v1) implementing DATA_MODEL.md — including the `academic-os-preferences`/`academic-os-semester` database split and the `TaskCompletionEvent` log from day one — `vite-plugin-pwa` manifest/service-worker wiring, CI (GitHub Actions: typecheck/lint/test/build), and first deployment to Netlify (approved host) with the production URL established. This is where ARCHITECTURE.md's decisions become real code and configuration.

## Stage 3 — Courses, Units & Content Blocks
Full CRUD for Courses, global Tags and their per-course associations, Units, and Content Blocks (rich-text/Markdown, file, image, video), including reordering, per PRODUCT_SPEC.md §2–5. Includes selecting and wiring the Markdown parser/sanitizer for Text blocks per the safety requirements in SECURITY.md §1. Built against the Stage 1 design.

## Stage 4 — Schedule, Tasks, Attendance & Notifications
Weekly schedule (templates), the central Task system (Overdue/Today/Upcoming, using the shared academic-week utility), attendance marking against schedule occurrences, and the in-app-open notification baseline described in ARCHITECTURE.md §"Notifications — platform constraints."

## Stage 5 — Official Grades & Practice Performance
Simple and Structured grading modes, grade categories/boundaries, grade calculations (current performance, required scores, etc.), and Practice Performance kept structurally distinct throughout.

## Stage 6 — Analytics & Semester Intelligence
Dashboards over the raw data accumulated by Stages 3–5: task completion, attendance, practice, grades, weekly/semester trends, strongest/weakest units, and correlation-only (never causal) insight copy, per PRODUCT_SPEC.md §13.

## Stage 7 — Export/Import, New Semester, Security Hardening & Production v1.0.0
Semester archive export/import (with full untrusted-input validation per SECURITY.md), separate media export, "Start New Semester" destructive flow, CSP hardening, dependency audit, accessibility pass, and the first `1.0.0` production release.

---

Stage boundaries may be refined slightly if a concrete technical reason emerges during a stage (e.g. discovering PWA notification work is better split across Stage 4 and a later stage) — but stages are not to be merged wholesale to save time; each is meant to produce a genuinely reviewable increment.
