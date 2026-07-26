# Changelog

All notable changes to this project are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows [Semantic Versioning](https://semver.org/) and is pre-1.0 during development (see `docs/DEVELOPMENT.md` §Versioning).

## [Unreleased]

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
