# Security & Privacy — Academic OS

> **Source-of-truth scope:** the threat model and required mitigations for a local-first PWA with no backend. Cross-reference [ARCHITECTURE.md](./ARCHITECTURE.md) for tooling and [DATA_MODEL.md](./DATA_MODEL.md) for the data this model protects.

## Threat Model Summary

This is a **static, backend-less SPA**: the deployed artifact is HTML/CSS/JS served from a static host, and all academic data lives in the user's browser (IndexedDB). There is no server to breach and no account/credential system. The realistic attack surface is therefore: (1) malicious/corrupt content the user themselves imports or attaches, (2) vulnerable dependencies shipped in the bundle, (3) service-worker/deploy hygiene, and (4) the browser's own storage/rendering primitives being misused by the app's own code.

## 1. Cross-Site Scripting (XSS)

- Never use `dangerouslySetInnerHTML` (or equivalent) for user-entered text (notes, descriptions, block content). React's default JSX text rendering escapes content — this is the baseline and must not be bypassed.
- If rich text/markdown is ever added to text content blocks (open UX question, deferred to Stage 1/3), it must go through a safe markdown renderer plus an HTML sanitizer (e.g. DOMPurify) before anything resembling raw HTML touches the DOM — not implemented until that need is real.
- User-entered strings that end up as `href`/`src` (e.g. a pasted link in a course description) must be scheme-validated (`http:`/`https:` only) before being rendered as a clickable link — `javascript:` and other dangerous schemes are rejected.

## 2. File & Blob Handling

- Uploaded files are validated by declared MIME type and a size cap appropriate to the block type (image/file/video) before being accepted into a ContentBlock; the app trusts neither the file extension nor the MIME type alone as proof of content, only as an intake filter.
- Files are stored and served as opaque `Blob`s via `URL.createObjectURL` for local rendering; the app never executes, evals, or interprets uploaded content as code, and object URLs are revoked when no longer displayed to avoid leaking memory/handles.
- PDFs/videos are rendered via the browser's native viewer/`<video>` element, not a custom parser, to avoid introducing a parsing attack surface in the app itself.

## 3. Import / Archive Handling — Untrusted Input

Any imported semester archive or media zip is treated as **fully untrusted**, even if the user is importing their own historical export:

- Parse defensively: `JSON.parse` wrapped in try/catch, with a clear "this file couldn't be read" failure path — never a crash.
- Validate the parsed structure against a versioned Zod schema **before** any of it touches application state; unknown/missing/mismatched top-level shape is rejected with a specific error, not silently coerced.
- Reject archives whose `archiveVersion` is newer than the app understands (forward-compat: fail loud, don't guess) and run explicit migration steps for older-but-known versions.
- Enforce a size limit on the archive file appropriate to structured JSON (media zips get a separate, larger but still bounded limit) to avoid pathological memory use from a corrupted or hostile file.
- Construct new internal objects field-by-field from validated data (allow-listed copy) rather than spreading/`Object.assign`-ing raw parsed JSON into internal state, to avoid prototype-pollution-style surprises from keys like `__proto__`/`constructor` in attacker-controlled JSON.
- Importing never silently replaces the active semester: the UX requires explicit confirmation and (recommended) offers to export the current semester first — see PRODUCT_SPEC.md §18.

## 4. Dependency & Supply-Chain Risk

- Dependency count is kept intentionally small (see ARCHITECTURE.md's stack table) — fewer dependencies is directly fewer transitive vulnerabilities and less supply-chain surface.
- `package-lock.json` is committed so builds are reproducible and reviewable.
- `npm audit` runs in CI; Dependabot (or equivalent) is enabled on the GitHub repo for automated dependency update PRs.
- New dependencies are added deliberately — checked for maintenance activity/popularity before adoption, not pulled in casually for minor convenience.

## 5. Service Worker Risks

- The service worker (via `vite-plugin-pwa`/Workbox) is scoped to the app's own origin/path and precaches only static app-shell assets — it never caches API responses (there are none) or user data (which lives in IndexedDB, outside the SW cache entirely).
- Update flow uses `registerType: "prompt"` (see ARCHITECTURE.md §PWA Strategy) specifically so a stale/broken cached version is never force-activated mid-session; the user explicitly triggers the swap to the new version.
- Because the SW never touches user data, a bad service-worker deploy can at worst serve a stale *UI*, never corrupt or leak academic *data*.

## 6. Content Security Policy

A strict CSP is a Stage 2 implementation task, planned now as: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' (only if a CSS-in-JS approach requires it — avoided if possible); object-src 'none'; base-uri 'self'; frame-ancestors 'none'`. No remote script or style CDNs are used, which keeps the CSP tight and removes a class of third-party-script supply-chain risk entirely.

## 7. Secrets & Environment Variables

There are no backend secrets in this architecture — the app is 100% static and client-side, so nothing sensitive can exist in an environment variable anyway (anything shipped to the client is inherently public). `.env*` files are still gitignored on principle (in case a future build-time public config value is introduced), and no `.env.example` currently needs any secret keys because none exist.

## 8. Git Repository Hygiene

`.gitignore` (see repo root) explicitly excludes: `node_modules`, build output, `.env*`, exported semester archives (`*.academic-archive.*`, `*-Media.zip`), any local data/db dump directories, and standard OS/editor artifacts. Real user academic data must never be committed to this repository under any circumstance, including as "sample" fixtures — test fixtures use clearly fictional data only.

## 9. Destructive Operations

- "Start New Semester" / "Clear Current Semester" requires an explicit, hard-to-fumble confirmation step (e.g. typing a confirmation phrase), never a single click, per PRODUCT_SPEC.md §19.
- Export and Clear are implemented as fully independent code paths with no automatic chaining between them, so a bug in one cannot cascade into accidental data loss via the other.

## 10. Data Corruption & Backup Validation

- Repository-layer reads are defensive: a record that fails schema expectations on read is surfaced as a recoverable error (e.g. "this record looks corrupted, skipped") rather than crashing the whole app or being silently deleted.
- Exported archives are validated at export time too (self-check: what we just wrote parses and round-trips) as a cheap early warning of a serialization bug, in addition to import-time validation.
- Schema migrations (Dexie `.upgrade()`) are additive and non-destructive by default (see DATA_MODEL.md §"Atomicity & migrations") — an app update must never be able to silently wipe a semester's worth of work.

## Privacy

- All academic and self-reported data (courses, grades, tasks, schedule, attendance, check-ins) is local-only by default; nothing is transmitted anywhere, because there is no server for it to go to.
- No tracking/behavioral analytics SDK is included. "Analytics" in this product means computing statistics over the user's own academic data, locally, for their own benefit — not telemetry about the user sent to a third party (see PRODUCT_SPEC.md §13, §25 of the original brief).
- The static hosting provider (Netlify or equivalent, see ARCHITECTURE.md) only ever serves the static app bundle; it has no access to IndexedDB contents, which never leave the browser.
- If any future feature would change this (e.g. optional cloud sync, opt-in crash reporting), it requires explicit product-owner approval and must be clearly disclosed and opt-in — not a default.

## Accessibility Note (cross-referenced from engineering quality goals)

Not a security concern per se, but tracked here as a Stage 1/implementation commitment: keyboard operability, visible focus states, semantic controls (real `<button>`/`<label>`/form elements, not div-soup), sufficient color contrast, `prefers-reduced-motion` respect, screen-reader-friendly labels, and touch-target sizing are all required of the eventual UI implementation, per WCAG-oriented practice.
