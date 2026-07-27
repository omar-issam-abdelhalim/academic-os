# Academic OS

A premium, local-first academic and learning management Progressive Web App — a personal academic operating system for organizing courses, units, materials, tasks, weekly schedule, attendance, grades, practice performance, analytics, and semester exports.

**Status:** Stage 0 (specification & architecture), Stage 2 (engineering foundation, live UI, PWA, CI), and Stage 3 (real Course/Unit/Content/Schedule/Task/Attendance/Grade/Practice persistence and Semester Export, replacing every Stage 2 reference fixture) are complete. Stage 1A (UX architecture) is approved; Stage 1B (visual design system) established approved token foundations before moving to direct implementation — see [docs/ROADMAP.md](./docs/ROADMAP.md) and [docs/STAGE_3_REPORT.md](./docs/STAGE_3_REPORT.md). Analytics (original Stage 6) and Import/Media Export/security hardening/`1.0.0` (the remainder of the original Stage 7) have not started.

## Quick Start

```
npm install
npm run dev
```

See [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for the full command reference (typecheck, lint, test, build).

## Deployment

GitHub is the source repository, GitHub Actions provides CI/CD, and **GitHub Pages** is the permanent production host — this is a settled architecture decision, not Netlify or any other provider. Every push to `main` that passes the quality gate (typecheck/lint/format/test/build/E2E) deploys automatically. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md#hosting--deployment) for the full pipeline, base-path, and PWA-correctness detail.

## Start Here

This repository is documentation-first — read the relevant docs before changing code:

1. [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) — what the product does and its business rules
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — the technical stack and why
3. [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — entities, relationships, storage architecture
4. [docs/SECURITY.md](./docs/SECURITY.md) — threat model and privacy commitments
5. [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — Git workflow, versioning, testing strategy, local dev commands
6. [docs/ROADMAP.md](./docs/ROADMAP.md) — the staged plan from here to `v1.0.0`
7. [docs/STAGE_1A_UX_ARCHITECTURE.md](./docs/STAGE_1A_UX_ARCHITECTURE.md) — approved navigation/IA/user flows
8. [docs/STAGE_1B_DESIGN_SYSTEM.md](./docs/STAGE_1B_DESIGN_SYSTEM.md) — approved visual foundations (tokens)
9. [docs/STAGE_2_REPORT.md](./docs/STAGE_2_REPORT.md) — what Stage 2 delivered and what's still a fixture vs. real
10. [docs/STAGE_3_REPORT.md](./docs/STAGE_3_REPORT.md) — what Stage 3 delivered (real persistence replacing every remaining fixture) and what's still deferred

## Principles

- **Local-first**: no accounts, no mandatory backend, no mandatory cloud database. Academic data lives on the user's device.
- **Flexible, not university-only**: courses can be university lectures, YouTube series, or self-study — modeled via a global, persistent set of tags, not a rigid type system.
- **Grades vs. practice, always separate**: official academic grades are never conflated with practice/study performance.
- **Correlation, not causation**: analytics describe patterns in the user's own data; they never claim a behavior *caused* an outcome.
- **Export and delete are independent**: exporting a semester never deletes it; clearing a semester never happens as a side effect of exporting.
- **Full history, not just current state**: e.g. task completion is tracked as a full event log, not a single overwritable timestamp, so analytics and exports remain accurate.

## License

[MIT](./LICENSE).
