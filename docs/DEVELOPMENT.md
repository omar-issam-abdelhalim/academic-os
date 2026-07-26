# Development Workflow — Academic OS

> **Source-of-truth scope:** how work actually gets done — Git workflow, versioning, changelog policy, testing strategy, and the documentation rule every future session (human or AI) must follow.

## Documentation Hierarchy (read this first, every session)

Before implementing anything, read the documents relevant to the change:

| Document | Owns |
|---|---|
| [PRODUCT_SPEC.md](./PRODUCT_SPEC.md) | Product behavior and business rules |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical stack and engineering decisions |
| [DATA_MODEL.md](./DATA_MODEL.md) | Entities, relationships, invariants, persistence |
| [SECURITY.md](./SECURITY.md) | Security/privacy threat model and mitigations |
| [ROADMAP.md](./ROADMAP.md) | Staged implementation plan and current stage |
| This file | Developer workflow itself |

**Rule for future Claude Code sessions (and any contributor):** if a task touches product behavior, data shape, or security-sensitive handling, read the corresponding document *before* writing code, and update it *as part of* the same change if the behavior/shape/threat model changes. Documentation drift is treated as a bug. If an instruction in a task conflicts with one of these documents, surface the conflict rather than silently picking one side.

## Commit Authorship Policy (permanent, do not modify without explicit request)

- All commits in this repository are authored solely under the project owner's configured Git identity (`user.name`/`user.email`, set repo-locally — never globally by tooling).
- No AI assistant or tool (Claude, Anthropic, or any other) is ever added as an author or co-author.
- Commit messages, PR descriptions, README/CHANGELOG/documentation, source files, release notes, and Git/repository metadata must never contain AI attribution lines (e.g. no `Co-Authored-By` for an AI tool, no "Generated with..." footers).
- GitHub contribution history and commit authorship for this project must reflect only the project owner.
- Any Claude Code session (or other AI tool) working in this repository must follow this policy automatically, without being reminded, and must not alter the repository's Git identity configuration unless the project owner explicitly requests it.

## Git Workflow

- **`main`** is the single long-lived branch and always reflects the production deployment target. No `develop`/`release`/`hotfix` branch hierarchy — that's unnecessary process for a solo personal project.
- Short-lived branches per unit of work, named by intent: `stage-N-<short-name>` for stage-scoped foundational work, `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>` otherwise.
- Open a PR into `main` even solo — it's a natural checkpoint for CI to run (typecheck/lint/test/build) before anything reaches the production branch, and it gives a reviewable diff/changelog moment.
- Squash-merge PRs to keep `main` history one logical commit per unit of work.
- Commit messages follow a lightweight Conventional Commits style (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`) — encouraged for changelog/readability purposes, not enforced by tooling in Stage 0 (a commit-lint hook can be added later if it earns its keep).
- Tag releases (`vX.Y.Z`) on `main` at the same commit whose `package.json` version and `CHANGELOG.md` entry match.

## Versioning

Semantic Versioning (`MAJOR.MINOR.PATCH`), pre-release throughout early development:

- `0.x.y` for all Stage 0–6 work. Each stage's foundational merge is a reasonable candidate for a minor bump (e.g. `0.1.0` after Stage 0), but version bumps are tied to *meaningful shipped increments*, not mechanically forced to match stage numbers.
- Patch bumps (`0.x.y` → `0.x.(y+1)`) for fixes/small non-breaking changes within a stage.
- **`1.0.0`** is reserved for the first genuinely production-ready release — i.e. the end of Stage 7 (export/import, new-semester, security hardening, production deploy), not before.
- After `1.0.0`, standard SemVer applies: breaking data/behavior changes bump MAJOR, backward-compatible features bump MINOR, fixes bump PATCH.

## Changelog

`CHANGELOG.md` at the repo root follows the [Keep a Changelog](https://keepachangelog.com/) format (`Added` / `Changed` / `Fixed` / `Removed` sections per version, newest first). Every stage/PR that changes product behavior, data shape, or user-facing capability adds an entry — documentation-only Stage 0 work is recorded as its own dated entry under the initial pre-release version.

## Testing Strategy

| Layer | Tool | Covers |
|---|---|---|
| Unit | Vitest | Grade calculations, Saturday–Friday academic-week utility, attendance-percentage math, archive schema validators, migration functions |
| Storage/integration | Vitest + `fake-indexeddb` + Dexie | Repository-layer logic (CRUD, cascading deletes, transactions) without a real browser |
| Component | Vitest + React Testing Library | Critical UI flows once built: task grouping display, grade-entry forms, destructive-action confirmation flows |
| Round-trip | Vitest | Export → import produces equivalent structured data (excluding intentionally-excluded large media) |
| End-to-end / PWA | Playwright (introduced when there's a real app to drive, likely Stage 2/3) | Offline behavior after install, service-worker update prompt flow, install-ability smoke test |

CI (GitHub Actions, `.github/workflows/ci.yml`) runs typecheck, lint, format check, the unit/integration/component test suites, a production build, and the Playwright E2E suite (against `vite preview`) on every push and PR. On `main`, a second job deploys the quality-gated build to GitHub Pages — see ARCHITECTURE.md's Hosting & Deployment section.

Priority order for what gets tested first as features land: anything with a formula a human could get subtly wrong (grade math, week boundaries, attendance %), anything that touches destructive operations (clear semester, import), and anything that crosses the untrusted-input boundary (archive import validation).

## Local Development

Scaffolded in Stage 2 (React + TypeScript + Vite, per ARCHITECTURE.md). Standard local loop:

| Command | Does |
|---|---|
| `npm install` | Install dependencies (lockfile-pinned) |
| `npm run dev` | Start the Vite dev server |
| `npm run typecheck` | `tsc -b --noEmit` across both app and Node (config) projects |
| `npm run lint` | ESLint (flat config, TypeScript + React Hooks + jsx-a11y rules) |
| `npm run format` / `format:check` | Prettier write / check |
| `npm test` | Vitest (unit, integration, component — jsdom + fake-indexeddb) |
| `npm run build` | Typecheck + production build (`dist/`) |
| `npm run preview` | Serve the production build locally |

`node scripts/generate-icons.mjs` regenerates the PWA icon set (`public/icons/`) if the brand mark ever changes — see the script's own header comment.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, test, build, and E2E on every push/PR to `main`; a separate `deploy` job (gated on that quality job passing) publishes `main` to GitHub Pages — the permanent production host, not Netlify or any other provider. See ARCHITECTURE.md's Hosting & Deployment section.

## Code Review Expectations

Even for solo development, a PR should be self-reviewed against: does it match PRODUCT_SPEC.md, does it preserve the invariants listed at the end of PRODUCT_SPEC.md, does it require a DATA_MODEL.md update, does it introduce a new dependency that should be justified in ARCHITECTURE.md, and does it touch anything in SECURITY.md's scope (file handling, import, destructive actions).
