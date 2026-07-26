# Academic OS

A premium, local-first academic and learning management Progressive Web App — a personal academic operating system for organizing courses, units, materials, tasks, weekly schedule, attendance, grades, practice performance, analytics, and semester exports.

**Status:** Stage 0 (specification & architecture) reviewed and finalized by the product owner. No application code exists yet by design — see [docs/ROADMAP.md](./docs/ROADMAP.md). Stage 1 has not started.

## Start Here

This repository is documentation-first. Before writing any code, read:

1. [docs/PRODUCT_SPEC.md](./docs/PRODUCT_SPEC.md) — what the product does and its business rules
2. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — the technical stack and why
3. [docs/DATA_MODEL.md](./docs/DATA_MODEL.md) — entities, relationships, storage architecture
4. [docs/SECURITY.md](./docs/SECURITY.md) — threat model and privacy commitments
5. [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) — Git workflow, versioning, testing strategy, and the rule for keeping docs in sync with code
6. [docs/ROADMAP.md](./docs/ROADMAP.md) — the staged plan from here to `v1.0.0`
7. [docs/STAGE_0_REPORT.md](./docs/STAGE_0_REPORT.md) — what Stage 0 delivered, decisions made, and open questions

## Principles

- **Local-first**: no accounts, no mandatory backend, no mandatory cloud database. Academic data lives on the user's device.
- **Flexible, not university-only**: courses can be university lectures, YouTube series, or self-study — modeled via a global, persistent set of tags, not a rigid type system.
- **Grades vs. practice, always separate**: official academic grades are never conflated with practice/study performance.
- **Correlation, not causation**: analytics describe patterns in the user's own data; they never claim a behavior *caused* an outcome.
- **Export and delete are independent**: exporting a semester never deletes it; clearing a semester never happens as a side effect of exporting.
- **Full history, not just current state**: e.g. task completion is tracked as a full event log, not a single overwritable timestamp, so analytics and exports remain accurate.

## License

[MIT](./LICENSE).
