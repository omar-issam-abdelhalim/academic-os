# Security & Privacy — Academic OS

> **Source-of-truth scope:** the threat model and required mitigations for a local-first PWA with no backend. Cross-reference [ARCHITECTURE.md](./ARCHITECTURE.md) for tooling and [DATA_MODEL.md](./DATA_MODEL.md) for the data this model protects.

## Threat Model Summary

This is a **static, backend-less SPA**: the deployed artifact is HTML/CSS/JS served from a static host, and all academic data lives in the user's browser (IndexedDB). There is no server to breach and no account/credential system. The realistic attack surface is therefore: (1) malicious/corrupt content the user themselves imports or attaches, (2) vulnerable dependencies shipped in the bundle, (3) service-worker/deploy hygiene, and (4) the browser's own storage/rendering primitives being misused by the app's own code.

## 1. Cross-Site Scripting (XSS)

- Never use `dangerouslySetInnerHTML` (or equivalent) for plain user-entered text (course/unit descriptions, labels). React's default JSX text rendering escapes content — this is the baseline and must not be bypassed.
- **Rich text in Text content blocks (approved direction — PRODUCT_SPEC.md §5):** Text blocks store Markdown-style source supporting headings, bold/italic, lists, links, and inline/code blocks. This is the one place in the app where formatted content is rendered from user input, and it must never become an XSS vector:
  - Render via **parse-then-sanitize**: a Markdown parser turns the source into a restricted node/element set, and the result is either (a) rendered through a component-based renderer that never touches `innerHTML` (a React-Markdown-style renderer mapping AST nodes to React elements is the safest shape), or (b) if any HTML-string step is ever used, passed through an HTML sanitizer (e.g. DOMPurify) with a strict allow-list before it touches the DOM.
  - Raw HTML embedded in a note's Markdown source (e.g. `<script>`, `<iframe>`, `onerror=` attributes) must never execute — it is stripped or rendered as inert escaped text, never passed through.
  - Links produced by the Markdown renderer are still subject to the scheme-validation rule below (`http:`/`https:` only).
  - **Implemented (Stage 3):** `src/lib/safeMarkdown.tsx` — a small hand-written parser that builds React elements directly from source text (never an HTML string, never `dangerouslySetInnerHTML`), satisfying (a) above by construction rather than by relying on a sanitizer to catch mistakes. No third-party Markdown/editor library was added.
- User-entered strings that end up as `href`/`src` (e.g. a pasted link in a course description, or a link inside a rich-text note) must be scheme-validated (`http:`/`https:` only) before being rendered as a clickable link — `javascript:` and other dangerous schemes are rejected.

## 2. File & Blob Handling

- **Implemented (Stage 3):** `src/domain/contentValidation.ts` — uploaded files are validated by declared MIME type (an allow-listed prefix per block type) and a size cap appropriate to the block type (15 MB image / 30 MB file / 250 MB video) before being accepted into a ContentBlock; the app trusts neither the file extension nor the MIME type alone as proof of content, only as an intake filter.
- Files are stored and served as opaque `Blob`s via `URL.createObjectURL` for local rendering; the app never executes, evals, or interprets uploaded content as code, and object URLs are revoked when no longer displayed to avoid leaking memory/handles.
- PDFs/videos are rendered via the browser's native viewer/`<video>` element, not a custom parser, to avoid introducing a parsing attack surface in the app itself.

## 3. Import / Archive Handling — Untrusted Input

**Implemented (Stage 5)** — `src/domain/archiveImport.ts` (pure parse/validate/convert logic) + `src/data/repositories/importRepository.ts` (the Dexie-facing write path) + `src/features/semester/ImportSemesterScreen.tsx` (UI). Every imported semester archive is treated as **fully untrusted**, even the user's own prior export:

- Parse defensively: `JSON.parse` wrapped in try/catch (`parseAndValidateArchiveText`), with a clear, specific "this file couldn't be read" failure path (`ImportParseError`) — never a crash.
- Validate the parsed structure against the same versioned Zod schema Export self-checks against (`semesterArchiveSchema`/`parseSemesterArchive`) **before** any of it touches application state; unknown/missing/mismatched top-level shape is rejected with a specific error (`ArchiveValidationError`), not silently coerced.
- `archiveVersion` is checked explicitly and *before* full schema validation, so a mismatch gets a specific, honest reason (`ImportVersionError`, `kind: "too-new" | "too-old"`) instead of a generic shape-mismatch error. An archive newer than the app understands is rejected (forward-compat: fail loud, don't guess). No archive version older than the current one has ever existed yet (`ARCHIVE_VERSION` has only ever been `1`), so there is nothing to migrate from today — the `"too-old"` path exists and is tested so a future `ARCHIVE_VERSION` bump gets honest behavior for real, not just in theory.
- A 50 MB size limit is enforced on the archive file (`MAX_ARCHIVE_FILE_SIZE_BYTES`) before it is even read into memory — appropriate for structured JSON; the Media Export zip (§ below) is a separate, larger-scale artifact this size limit does not apply to (there is no Media *Import* in v1 — see PRODUCT_SPEC.md §17/§18, Media Export is export-only).
- Every internal Dexie record is constructed field-by-field from validated data (`convertArchiveToInternalRecords`) — never a spread/`Object.assign` of the raw parsed JSON into internal state — so a crafted `__proto__`/`constructor` key in attacker-controlled JSON can't surprise anything downstream. Directly tested (`archiveImport.test.ts`): a `__proto__` key smuggled through real `JSON.parse` never survives the pipeline or pollutes `Object.prototype`.
- A tag color outside the current curated palette falls back to a safe default (`"slate"`) rather than being written verbatim (defensive read, §10 below).
- File/image/video content blocks lose their binary data by design (semester archives never include blob binaries, per §16 of the product spec) — on import, a fresh, never-stored `blobId` is generated so the record still satisfies its type; the existing `ContentBlockCard`/`useBlobUrl` path already renders this defensively (metadata shows, no broken preview/download link). Documented, known limitation, not a bug.
- Importing never silently replaces the active semester: the UX requires an explicit two-step confirmation (see the archive summary preview, then a `ConfirmationDialog`) and recommends — never forces — exporting the current semester first (a `Link` to Semester Export, not a blocking gate) — PRODUCT_SPEC.md §18.
- Tags are global/persistent (a separate database, DATA_MODEL.md §Tag) — Import inserts a tag from the archive's snapshot only if no tag with that id already exists locally; it never overwrites a tag definition the user may have since renamed/recolored on this install.

## 4. Dependency & Supply-Chain Risk

- Dependency count is kept intentionally small (see ARCHITECTURE.md's stack table) — fewer dependencies is directly fewer transitive vulnerabilities and less supply-chain surface.
- `package-lock.json` is committed so builds are reproducible and reviewable.
- **Implemented (Stage 5):** `npm audit --audit-level=critical` runs as its own CI step (`.github/workflows/ci.yml`), failing the build on any critical advisory; `.github/dependabot.yml` is enabled (weekly npm + GitHub Actions update PRs, dev dependencies grouped) for automated dependency update PRs.
- **Documented, consciously-accepted exception:** as of Stage 5, `npm audit` reports one **high** advisory in `react-router`/`react-router-dom` (GHSA-qwww-vcr4-c8h2, "RSC Mode CSRF Bypass Allows Action Execution Before 400 Response"). The only available fix is `npm audit fix --force`, which **downgrades** `react-router-dom` to `7.11.0` — no patched release exists yet in the `7.x`/`8.x` line this app depends on. The advisory is specific to React Router's server-side RSC (React Server Components) data mode and route actions talking to a backend; Academic OS is a 100% client-side SPA on plain `BrowserRouter` with no server, no RSC, and no route loaders/actions of any kind (per this document's own Threat Model Summary — there is no server to breach). The vulnerable code path is not reachable. CI's `--audit-level=critical` (rather than the stricter default) reflects this explicit, reviewed decision rather than silently suppressing the finding — revisit if a patched release ships, or if the app's architecture ever grows a server/RSC/actions surface (which would itself require a separate, explicit architecture change per DEVELOPMENT.md's change-control rule).
- New dependencies are added deliberately — checked for maintenance activity/popularity before adoption, not pulled in casually for minor convenience. **Recharts (Stage 4)**: an already-planned dependency (ARCHITECTURE.md's stack table pre-approved it for charting), actively maintained, renders plain SVG client-side from already-local data, makes no network calls, and introduces zero new `npm audit` advisories (verified at install time). **JSZip (Stage 5)**: an already-planned dependency (ARCHITECTURE.md's stack table pre-approved it for archive/zip generation), the mature standard for client-side zip creation, used for Media Export; introduces zero new `npm audit` advisories (verified at install time).

## 5. Service Worker Risks

- The service worker (via `vite-plugin-pwa`/Workbox) is scoped to the app's own origin/path and precaches only static app-shell assets — it never caches API responses (there are none) or user data (which lives in IndexedDB, outside the SW cache entirely).
- Update flow uses `registerType: "prompt"` (see ARCHITECTURE.md §PWA Strategy) specifically so a stale/broken cached version is never force-activated mid-session; the user explicitly triggers the swap to the new version.
- Because the SW never touches user data, a bad service-worker deploy can at worst serve a stale *UI*, never corrupt or leak academic *data*.

## 6. Content Security Policy

Implemented, delivered via `<meta http-equiv="Content-Security-Policy">` in `index.html`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'
```

No remote script or style CDNs are used, which keeps the CSP tight and removes a class of third-party-script supply-chain risk entirely. `script-src` has no `'unsafe-inline'` allowance — the app ships zero inline scripts (the GitHub Pages deep-link redirect handling lives in `src/app/githubPagesRedirect.ts`, an ordinary same-origin bundled module, specifically so this stays true). `style-src 'unsafe-inline'` is a narrow, pre-existing, documented allowance for a handful of components that set genuinely dynamic computed values via the `style` attribute (desktop week-grid event positioning, progress bars); inline style injection cannot execute JavaScript, so this does not weaken the script-execution boundary.

**Header vs. meta delivery — a GitHub Pages limitation, accepted deliberately:** the CSP above was originally planned for HTTP-header delivery (via Netlify's `netlify.toml` `[[headers]]`). GitHub Pages is 100% static file serving with **no mechanism to send custom HTTP response headers at all** — there is no server-side config surface to move this to. A `<meta http-equiv="Content-Security-Policy">` tag is the only static-host fallback, and it has real, spec-defined gaps versus the header form:

- `frame-ancestors`, `sandbox`, and `report-uri`/`report-to` are **not honored** when CSP is delivered via `<meta>` — browsers silently ignore them. The meta CSP above omits `frame-ancestors` rather than including a directive that would falsely imply protection.
- There is **no** static/meta equivalent for the `X-Content-Type-Options: nosniff`, `Permissions-Policy`, or `X-Frame-Options` HTTP headers Netlify previously sent (`netlify.toml`, now removed). These protections are **lost** on GitHub Pages and cannot be replicated without introducing a server, which is out of scope by design (local-first, no mandatory backend).

**Residual risk assessment**: this is judged acceptable because the app has no cookies, no authentication/session state, no cross-origin embeds, and no server response body an attacker could get GitHub Pages to mis-serve — the primary risk `X-Content-Type-Options`/`X-Frame-Options`/`Permissions-Policy` mitigate (session hijacking via clickjacking/MIME-sniffing, unwanted device API access) is materially lower for a credential-less, local-data-only SPA than for a typical authenticated web app. This gap is recorded here rather than silently dropped so a future reviewer (human or AI) can re-evaluate it if the threat model ever changes (e.g. if auth/cloud sync is ever introduced — see Privacy below).

**Conflict surfaced, not silently resolved (Stage 5):** a Stage 5 task prompt specified a target CSP including `frame-ancestors 'none'`. This document already established, in the paragraph above, that `frame-ancestors` is a no-op when delivered via `<meta>` — adding it to `index.html` would not have added any real protection, only a directive browsers silently ignore, which is worse than omitting it (a future reader could mistake it for real coverage). The meta CSP was **not changed** to add it; this is the same reasoning already on record here, re-confirmed rather than overridden.

## 7. Secrets & Environment Variables

There are no backend secrets in this architecture — the app is 100% static and client-side, so nothing sensitive can exist in an environment variable anyway (anything shipped to the client is inherently public). `.env*` files are still gitignored on principle (in case a future build-time public config value is introduced), and no `.env.example` currently needs any secret keys because none exist.

## 8. Git Repository Hygiene

`.gitignore` (see repo root) explicitly excludes: `node_modules`, build output, `.env*`, exported semester archives (`*.academic-archive.*`, `*-Media.zip`), any local data/db dump directories, and standard OS/editor artifacts. Real user academic data must never be committed to this repository under any circumstance, including as "sample" fixtures — test fixtures use clearly fictional data only.

## 9. Destructive Operations

- "Start New Semester" / "Clear Current Semester" requires an explicit, hard-to-fumble confirmation step (e.g. typing a confirmation phrase), never a single click, per PRODUCT_SPEC.md §19.
- Export and Clear are implemented as fully independent code paths with no automatic chaining between them, so a bug in one cannot cascade into accidental data loss via the other.

## 10. Data Corruption & Backup Validation

- Repository-layer reads are defensive: a record that fails schema expectations on read is surfaced as a recoverable error (e.g. "this record looks corrupted, skipped") rather than crashing the whole app or being silently deleted.
- **Implemented (Stage 3):** exported archives are validated at export time too (`exportRepository.ts`'s `buildSemesterArchive` runs the freshly built archive back through `parseSemesterArchive` before it's ever downloaded) — self-check: what we just wrote parses and round-trips, a cheap early warning of a serialization bug, in addition to the (not-yet-implemented) import-time validation this same schema will serve later.
- Schema migrations (Dexie `.upgrade()`) are additive and non-destructive by default (see DATA_MODEL.md §"Atomicity & migrations") — an app update must never be able to silently wipe a semester's worth of work.

## Privacy

- All academic and self-reported data (courses, grades, tasks, schedule, attendance, check-ins) is local-only by default; nothing is transmitted anywhere, because there is no server for it to go to.
- No tracking/behavioral analytics SDK is included. "Analytics" in this product means computing statistics over the user's own academic data, locally, for their own benefit — not telemetry about the user sent to a third party (see PRODUCT_SPEC.md §13, §25 of the original brief).
- The static hosting provider (GitHub Pages — approved, permanent, see ARCHITECTURE.md's Hosting & Deployment section) only ever serves the static app bundle; it has no access to IndexedDB contents, which never leave the browser. Deployment does not imply, and must never imply, cloud synchronization of academic data.
- If any future feature would change this (e.g. optional cloud sync, opt-in crash reporting), it requires explicit product-owner approval and must be clearly disclosed and opt-in — not a default.

## Accessibility Note (cross-referenced from engineering quality goals)

Not a security concern per se, but tracked here as a Stage 1/implementation commitment: keyboard operability, visible focus states, semantic controls (real `<button>`/`<label>`/form elements, not div-soup), sufficient color contrast, `prefers-reduced-motion` respect, screen-reader-friendly labels, and touch-target sizing are all required of the eventual UI implementation, per WCAG-oriented practice.
