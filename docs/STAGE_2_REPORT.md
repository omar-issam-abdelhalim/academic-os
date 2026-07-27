# Stage 2 Report — Engineering Foundation, Live UI System, PWA & Production Pipeline

> **Status: finalized — APPROVED.** This report was first updated in a Stage 2 *finalization* pass that replaced the initial pass's un-verifiable mobile-viewport claim with real, deterministic Playwright verification (151 tests across 7 viewport widths), ran a real offline/PWA verification pass, ran an automated accessibility scan that found and fixed two genuine WCAG contrast defects, and fixed several UI elements that silently no-op'd instead of honestly signaling their Stage 3 boundary. That pass left one gap open: Netlify deployment was blocked on an interactive login the project owner would have had to perform manually. **A second, deployment-migration finalization pass (this update) resolved that gap by replacing Netlify with GitHub Pages entirely** — removed Netlify, built a GitHub Actions → GitHub Pages pipeline, fixed the PWA/router/CSP correctness issues a subpath production host requires, pushed to `main`, watched the real GitHub Actions run go green, and verified the actual deployed production PWA in a real browser. See §10–§11, §14, and §17–§21 for the full detail; §25 is the final recommendation.

## 1. Stage Objective

Establish the complete engineering foundation for Academic OS: real project toolchain, a responsive component/design-token system implementing the approved `STAGE_1B_DESIGN_SYSTEM.md`, a live fixture-driven reference UI covering the approved `STAGE_1A_UX_ARCHITECTURE.md` screen inventory, the Dexie/IndexedDB persistence foundation from `DATA_MODEL.md`, PWA installability/offline foundation, testing/CI/deployment configuration, and a security baseline — without implementing Stage 3's full domain-feature CRUD (Courses, Units, Tasks, Schedule, Grades, Practice all stay reference/fixture-driven except where noted in §12).

## 2. Implementation Status

**Complete, including production deployment.** Every item in the Stage 2 scope (§2 of the brief: A–M) is implemented, tested, and verified in a real browser — including deployment, which was the one gap left open by the prior finalization pass. Netlify (blocked on interactive login, never deployed) has been fully removed and replaced with a GitHub Pages + GitHub Actions pipeline; the real production URL is live and verified (§17, §21).

## 3. Toolchain

| Concern | Choice | Version (resolved) |
|---|---|---|
| Language | TypeScript, strict mode | 6.0 |
| Framework | React | 19.2 |
| Build tool | Vite | 8.1 |
| Router | React Router (declarative `<Routes>`, not the data router — see §19) | 7.18 |
| Local storage | Dexie + dexie-react-hooks | 4.4 |
| Validation | Zod (installed; not yet consumed — see §22) | 4.4 |
| Icons | lucide-react | 1.27 |
| Fonts | @fontsource (self-hosted, Latin subset only) | 5.3 |
| PWA | vite-plugin-pwa (Workbox) | 1.3 |
| Testing | Vitest + Testing Library + fake-indexeddb + jsdom | 4.1 / 16.3 / 6.2 |
| Lint/format | ESLint (flat config) + Prettier | 9.39 / 3.9 |
| Package manager | npm | 11 |

No CSS framework — plain CSS Modules over the token layer (`src/styles/tokens.css`), per ARCHITECTURE.md's "no CSS framework mandated" and to keep the dependency count minimal.

## 4. Application Architecture

```
UI (React components, src/features/*, src/components/*)
   ↓
Domain layer (pure functions — src/domain/*: academicWeek, attendancePresentation,
   scheduleOccurrence, gradeSummary)
   ↓
Repository layer (src/data/repositories/*: preferences, tags, semester)
   ↓
Two Dexie/IndexedDB databases (src/data/db.ts): academic-os-preferences,
   academic-os-semester
```

Client-side routing only (`react-router-dom`'s declarative `<Routes>`, not `createBrowserRouter`'s data-router APIs — a deliberate choice, see §19). Route-level code splitting via `React.lazy` for every screen except Home and Semester Setup (§9 covers the bundle-size result).

## 5. Source Structure

```
src/
  app/         Shell, routing, nav (AppShell, Sidebar, BottomNav, CommandPalette,
               UpdatePrompt, RequireSemester, ScreenHeader, routes.tsx)
  components/  Design-system primitives (Button, FormControls, Tag, Overlay,
               Menu, SegmentedControl, States, Tooltip, Divider)
  domain/      Pure business logic + their unit tests
  data/        Dexie schema, storage-error handling, repositories (+ tests)
  features/    One folder per screen/domain area (home, tasks, schedule,
               courses, grades, practice, performance, semester, settings,
               tags, more, shared)
  fixtures/    Reference-UI-only mock data, clearly separated from data/
  hooks/       useTheme, useMediaQuery, useOnlineStatus, useFocusTrap
  lib/         classNames, breakpoints, safeMarkdown
  styles/      tokens.css, global.css, fonts.ts
  types/       Entity types transcribed from DATA_MODEL.md
  test/        Vitest setup (jest-dom, fake-indexeddb, PWA virtual-module mock)
```

119 files under `src/`, none of them enormous — the largest screens (Course Detail, Schedule) stay under ~180 lines including JSX.

## 6. Design-System Implementation

`src/styles/tokens.css` implements every token category from `STAGE_1B_DESIGN_SYSTEM.md` §3–10: the three-typeface type ramp (Source Serif 4 / IBM Plex Sans / IBM Plex Mono, self-hosted — see §19 for why), full light + dark color palettes, the 9 tag hue pairs, spacing/radius/elevation/motion/icon-size scales. **Implementation-level decisions made within this stage** (Stage 1B's own §0 explains Figma work stopped before these were exported): the complete dark-theme palette (only 3 anchor values were given) and the 9 tag hue hex pairs (only names were given) were derived by the implementer, following Stage 1B's stated intent (re-tune lightness/contrast for a dark canvas; keep each hue legible against its own theme's text/background tokens). These are documented inline in `tokens.css`'s header comment.

Nine reusable primitives (`src/components/`) cover the required set from the brief: Button/IconButton, Field/Input/Textarea/Select/Checkbox/Toggle, TagChip/StatusBadge, Dialog/Sheet/ConfirmationDialog, Menu, SegmentedControl, EmptyState/ErrorState/Skeleton/OfflineIndicator, Tooltip, Divider — plus two shared cross-feature components (`TaskRow`, `AttendanceControl`) that are reused identically everywhere Stage 1A requires (Home, Tasks, Course/Unit-scoped views; Home, Day Detail, desktop grid, Course Detail respectively).

## 7. Theme Implementation

`useTheme`/`ThemeProvider` (`src/hooks/useTheme.tsx`) reads/writes the **real** `AppPreferences.theme` field via `preferencesRepository` — not a stub. `system` follows `prefers-color-scheme` (no `data-theme` attribute set); `light`/`dark` set an explicit `data-theme` attribute that wins over the media query. Verified in a real browser: switching Settings → Appearance → Light/Dark/System instantly re-themes the whole app and persists across reloads (backed by IndexedDB, confirmed via the Settings screen's live storage-usage readout).

## 8. Navigation Implementation

One responsive shell (`AppShell.tsx`) renders either `Sidebar` (desktop, ≥1024px) or `BottomNav` (mobile) around the same `<Outlet/>` content — verified in a real browser at the one viewport width this environment's browser-automation tools could actually control (see §10's honest caveat). Mobile bottom nav: Home/Tasks/Schedule/Courses/More (5 items, filled-icon selected state). Desktop sidebar: Home/Tasks/Schedule/Courses/Performance/Settings, plus a Cmd/Ctrl+K Command Palette for quick navigation (Stage 3 will extend it with quick-add actions once creation flows are real). Course Detail's compact segmented sub-navigation (Units/Tasks/Schedule/Grades/Practice) is a real, working `SegmentedControl` driven by a `?section=` query param — deep-linkable and shareable.

## 9. Reference Screens Implemented

All screens required by the brief's §15 inventory, built against fixture data (see §41's separation rule) except where noted as real:

| Screen | Notes |
|---|---|
| Semester Setup | **Real** — writes to Dexie |
| Home | Current/next/none class priority, overdue+today tasks, weekly check-in prompt |
| Tasks (global) | Overdue/Today/Upcoming (week-grouped, current week expanded)/No due date/Completed, undo snackbar |
| Schedule | Mobile Week Overview → Day Detail; desktop full Sat–Fri grid with click-to-detail |
| Courses | Grid, collapsed-by-default tag filter |
| Course Detail | Header + Units default + segmented Tasks/Schedule/Grades/Practice |
| Unit Detail | Content blocks (safe-rendered text, file/image/video metadata), collapsible Tasks/Practice |
| Add Content | Type-picker sheet (mobile) / dialog (desktop) |
| Grades | Both Simple Mode (Mathematics II) and Structured Mode (CSAI 101, deliberately incomplete category to prove the "not yet allocated" honesty rule) |
| Practice | Visually distinct from Grades (info-blue, sparkle icon) |
| Performance Hub | Course filter, task/attendance/grade/practice stat bars, course comparison, correlation-only footnote |
| Settings | **Real** theme, real semester info, real storage estimate; notification toggle is reference-only (Stage 4 implements the actual scheduling) |
| Tags | **Real** — full create/list/delete via `tagRepository`/`preferencesDb`, verified end-to-end in-browser |
| Semester End / Export | Reference; export buttons say plainly they're Stage 7 placeholders rather than faking success |
| Start New Semester | **Real** — typed "DELETE" confirmation, actually calls `startNewSemester()` |
| More (mobile) | Performance/Tags/Settings/Data entry points |

## 10. Responsive Behavior — Finalization: Real, Deterministic Verification

The initial Stage 2 pass could not verify mobile viewports because the interactive browser tool's `resize_window` had no observable effect. This finalization pass replaces that gap with **Playwright driving real Chromium against the actual production build** (`vite preview`, not a simulation) — deterministic, repeatable, and now part of CI (`.github/workflows/ci.yml`), not a one-off manual check.

**Method:** `e2e/responsive.spec.ts`, run via `npm run test:e2e`.

**Viewports checked:** 320×690, 360×740, 375×667, 390×844, 430×932 (the five phone widths requested), 768×1024 (tablet), 1440×900 (desktop) — defined in `e2e/helpers.ts`.

**Coverage per viewport:** all 16 screens in the Stage 1A inventory (Home, Tasks, Schedule, Courses, Course Detail ×5 sections, Unit Detail, Performance, Settings, Tags, Semester End, Start New Semester, More) — 112 horizontal-overflow checks (`document.documentElement.scrollWidth <= clientWidth`), plus:
- Mobile nav: bottom nav visible with all 5 items meeting the 44px touch-target minimum, desktop sidebar absent (6 viewports).
- Desktop nav: sidebar + Command Palette hint visible, bottom nav absent (1 viewport).
- Dialogs: the Tags "New tag" overlay (sheet on mobile, dialog on desktop) and the desktop Schedule-grid event-detail dialog stay within the viewport bounds at every width (8 checks).
- Long content: the longest fixture strings ("Machine Learning Specialization", "Lecture 04 — Neural Networks") don't overflow at the narrowest width (320px).

**Result: 151/151 passing.** One real responsive defect was found and fixed in the process — the desktop Schedule grid's compact event cells clipped attendance controls for 1-hour classes; fixed by collapsing settled attendance states behind a click-to-correct badge (`AttendanceControl.tsx`) and moving the full control into a `<Dialog>` opened from the grid cell (`WeekGrid.tsx`), rather than cramming three buttons into a narrow cell. The rest of the failures encountered while building this suite were test-authoring issues (animation-timing races, an over-strict pixel tolerance, ambiguous locators), each corrected and documented inline in the relevant `e2e/*.spec.ts` file's own comments.

CSS breakpoints match `STAGE_1B_DESIGN_SYSTEM.md` §10 exactly (`src/styles/tokens.css` + `src/lib/breakpoints.ts` as the JS-side source of truth): mobile <600px, tablet 600–1024px, desktop ≥1024px, wide ≥1440px content-width cap.

**Still not done, honestly:** this is automated layout/overflow/touch-target verification, not a human eyeballing the visual design at each size — it catches breakage (clipping, overflow, missing nav, undersized targets) but not subtle spacing/proportion judgment calls. A human visual pass on a real device remains valuable before shipping, but the class of defect the brief specifically worried about ("could not visually verify") is now genuinely, deterministically covered.

## 11. Accessibility Baseline — Finalization: Real Spot-Check, One Genuine Defect Found and Fixed

**Method:** `e2e/accessibility.spec.ts` (Playwright, real Chromium) combining scripted keyboard-interaction checks with an automated `axe-core` scan (`@axe-core/playwright`) — a genuine tool-verified check, not just code review.

**Checked and passing:**
- Desktop sidebar is fully keyboard-reachable and activatable (Tab to "Tasks", Enter, navigates) — no mouse involved.
- `:focus-visible` applies a real, non-`none` outline to the focused element.
- The Tags "New tag" dialog: focus is trapped inside it for repeated Tab presses, Escape closes it, and focus is restored to the exact triggering icon button afterward (verified via its `aria-label`, since it's icon-only).
- No keyboard trap on a plain screen (Settings) — 12 Tab presses reach more than one distinct focusable node.
- Every button on Home has a real accessible name (visible text or `aria-label`).
- **Automated `axe-core` scan of Home, Courses, Settings, and Tags found a genuine WCAG 2 AA violation**: `text/tertiary` (`#8B8880`, inherited unchanged from Stage 1B's token table) measured 3.13:1 against `bg/sunken` and 3.38:1 against `bg/canvas` — both below the required 4.5:1 for normal text. **Fixed** by darkening the token to `#6E6A62` (≈4.76:1 / ≈5.15:1), computed by hand against the WCAG relative-luminance formula and confirmed by re-running the scan clean. Dark theme's equivalent token (`#86847C`) was checked the same way and already passes (≈4.74–4.96:1) — left unchanged. This is the one place this finalization pass touched a Stage 1B-specified value, and it did so because §4's own text flagged contrast verification as `[PENDING — Phase G]` — this fix *is* that verification, arriving early because Stage 2 needed it. See `docs/STAGE_1B_DESIGN_SYSTEM.md`'s token table and `src/styles/tokens.css` for the documented before/after.

**Also true, from the initial pass and still holding:** all icon-only controls require `aria-label` at the type level; status is never color-only (`StatusBadge` pairs tone with text; "Attendance not recorded" vs. "Missed" are asserted distinct in a unit test); `prefers-reduced-motion` collapses animation durations globally (and is exercised by the E2E suite itself, which runs with it enabled).

**Deliberately not attempted** (scope discipline, per the brief's own "do not turn this into an unrelated full WCAG certification exercise"): a full manual tab-order walkthrough of every screen, and a contrast audit of every token pair beyond what axe's scan of four representative pages surfaced.

## 12. Dexie/IndexedDB Foundation

Both databases and the full v1 schema from `DATA_MODEL.md` are declared in `src/data/db.ts`, including `TaskCompletionEvent` from the initial version (per the Stage 0 finalization decision) — even though only a subset of tables has a repository yet. **Implemented repositories (real, tested):** `preferencesRepository` (theme, onboarding flag), `tagRepository` (global Tag CRUD), `semesterRepository` (create/get active semester, `startNewSemester`). Course/Unit/ContentBlock/Task/ScheduleTemplate/ScheduleOccurrence/GradeCategory/GradeEntry/GradeBoundary/PracticeEntry/WeeklyCheckIn have schema but no repository — that's explicit Stage 3+ scope. `src/data/storageErrors.ts` classifies and normalizes `QuotaExceededError`/version-conflict/blocked failures so no repository call can fail silently. Verified in-browser: creating a semester, creating/deleting a Tag, and `startNewSemester` all round-trip through real IndexedDB (confirmed via Settings' live storage-usage readout changing, and Tags persisting/disappearing correctly).

## 13. PWA Implementation

`vite-plugin-pwa` (Workbox, `generateSW` mode) precaches the app shell only (`globPatterns: ["**/*.{js,css,html,woff2}"]` — icons and other assets excluded from precache, user data was never eligible since it's not a static asset). Manifest includes name/short_name/description, `standalone` display, theme/background colors, and a real icon set — see §19 for how the icons were produced. `registerType: "prompt"` with a genuine `useRegisterSW`-based `UpdatePrompt` component (not just configured and unused): **verified in-browser** — after rebuilding while the old build was still loaded, the app showed "A new version of Academic OS is available — Refresh to update," and clicking it correctly activated the new service worker and picked up code changes (this was real, incidental proof during the WeekGrid bug-fix testing, not staged).

## 14. Offline Behavior — Finalization: Real Verification, One Documented Tooling Limitation

**Method:** `e2e/pwa.spec.ts`, Playwright against the real production build.

**Verified for real, against a real (blocked) network:**
- Manifest is valid, fetchable, and declares `standalone` display and a maskable icon.
- Every icon referenced in the manifest resolves with `200` and the correct `image/png` content type.
- The service worker reaches the actual `"activated"` state (not just `ready`, which can resolve while the worker is still `"activating"` — the test listens for the real `statechange` event instead of trusting `ready`'s resolution as proof of the terminal state).
- The Cache Storage precache contains only static app-shell assets, never anything resembling an API/data path (there are none in this architecture, so this also guards against ever accidentally introducing one).
- **With `context.setOffline(true)` (network requests genuinely blocked) and the page reloaded**, the full app shell renders — nav, Home's heading, the Overdue task list — from precache, not from a live network.
- **With the network still blocked**, Settings correctly re-reads the active semester (`"Year 2 · Semester 1"`) from IndexedDB after a reload — proving Dexie-backed data survives a real offline reload, not just the static shell.

**One documented, real environment limitation, not a product defect:** `context.setOffline(true)` reliably blocks network requests (confirmed above) but was confirmed by direct reproduction to leave `navigator.onLine` reading `true` in this Chromium/Playwright combination. `<OfflineIndicator>` correctly uses the standard `navigator.onLine`/`online`/`offline` APIs, so this is a test-environment gap, not a component defect — but it does mean the banner's behavior under a *real* network disconnect has still not been independently verified, and that specific claim is not made here.

## 15. Testing Setup

Two layers now. **Unit/integration/component:** Vitest + `@testing-library/react` + `fake-indexeddb` + jsdom. **43 tests, 9 files, all passing:**
- `academicWeek.test.ts` — Sat–Fri boundary correctness (start/end exact times, week-membership edge cases at the Friday/Saturday boundary, `bucketForDate`, `academicWeekDays`/`DAY_LABELS` alignment, `formatWeekRange`) — all date assumptions verified against actual calendar computation, not asserted from memory.
- `attendancePresentation.test.ts` — Upcoming/In-progress/Not-recorded derivation, and the specific "not-recorded must never equal missed" boundary condition.
- `gradeSummary.test.ts` — recorded-sum math, unallocated-points honesty (never negative, never a fabricated zero), category nesting.
- `preferencesRepository.test.ts`, `tagRepository.test.ts`, `semesterRepository.test.ts` — real Dexie round-trips against `fake-indexeddb`, including the specific invariant that `startNewSemester` clears the semester DB but never the preferences DB (Tags survive).
- `Button.test.tsx`, `AttendanceControl.test.tsx` — component behavior/interaction.
- `App.test.tsx` — the semester gate genuinely redirects to Semester Setup when no semester exists in a real (fake) IndexedDB, not a mocked check.

One environment note: `RequireSemester` was changed from a `dexie-react-hooks` live-query subscription to a one-time async check, because the live-query's `BroadcastChannel`-based reactivity did not reliably resolve under jsdom + fake-indexeddb in tests (real browsers are unaffected — this is a documented category of test-environment friction with that library combination, not a production concern). This was also the more correct choice functionally: nothing in the app needs the gate to react to an external change, since both places that change semester existence already `navigate()` explicitly right after the write.

**E2E (new this pass):** Playwright + `@axe-core/playwright`, against the real production build. **151 tests, 3 files, all passing:**
- `e2e/responsive.spec.ts` (136 tests) — overflow, nav, dialogs, long content, across 7 viewports — see §10 for the full breakdown.
- `e2e/accessibility.spec.ts` (9 tests) — keyboard navigation, focus-visible, dialog focus trap/restore, no-keyboard-trap, accessible names, automated axe scan — see §11.
- `e2e/pwa.spec.ts` (6 tests) — manifest, icons, service worker lifecycle, precache contents, real offline reload (shell + Dexie data) — see §14.

Vitest's config was scoped to `src/**/*.test.{ts,tsx}` (`vite.config.ts`) so its default glob doesn't also try to run the Playwright specs under `e2e/` (which import Playwright's own conflicting `test` global) — a real conflict discovered and fixed during this pass, not a hypothetical one.

## 16. CI Setup

`.github/workflows/ci.yml`: on push/PR to `main`, a `quality` job runs `npm ci` (lockfile-deterministic), typecheck, lint, format check, unit test, build, then installs Playwright's Chromium and runs the E2E suite (uploading the HTML report as an artifact if anything fails). A second `deploy` job, gated on `quality` passing and only on pushes to `main` (never PRs), builds again with the GitHub Pages base path and publishes via the official GitHub Pages actions (§17). Least-privilege throughout: top-level `permissions: contents: read`; `deploy` overrides this for itself only with `pages: write`/`id-token: write`.

**Real CI result (accessibility/responsive finalization pass):** the first push of that pass (`20ea573`) ran on GitHub Actions (Ubuntu runner) and **failed** — not a flake, but two genuine defects the Windows-local run hadn't surfaced: a second WCAG AA contrast failure (`status/warning` on `status/warning-subtle`, 4.13:1) and a real test race in the offline-data E2E test (`net::ERR_INTERNET_DISCONNECTED`, going offline before the service worker was confirmed to be controlling the page). Both were fixed for real in `1421f51`, whose run ([`30223267720`](https://github.com/omar-issam-abdelhalim/academic-os/actions/runs/30223267720)) was fully green.

**Real CI result (this deployment-migration pass):** push `059fa15` triggered run [`30225987789`](https://github.com/omar-issam-abdelhalim/academic-os/actions/runs/30225987789) on GitHub Actions. Both jobs passed on the first attempt: `quality` (typecheck, lint, format check, 43/43 unit tests, build, 151/151 E2E) in 3m26s, `deploy` (build with `VITE_BASE_PATH=/academic-os/`, `configure-pages`, `upload-pages-artifact`, `deploy-pages`) in 36s. No follow-up fix commit was needed this time.

## 17. GitHub Pages / Deployment Setup

**Deployed and verified live.** Netlify's `netlify.toml` is deleted; GitHub Pages is now the permanent hosting decision (recorded in ARCHITECTURE.md's Hosting & Deployment section). The `deploy` job in `.github/workflows/ci.yml` (§16) builds the app with `VITE_BASE_PATH` derived from `GITHUB_REPOSITORY` at CI time (never hardcoded in the workflow) and publishes via `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages` — official GitHub actions only, no third-party deploy action.

GitHub Pages itself was enabled for the repository via `gh api --method POST repos/omar-issam-abdelhalim/academic-os/pages -f build_type=workflow` (Actions-sourced Pages, not the legacy "deploy from a branch" mode) — this was the one repository setting that needed a one-time API/UI action outside the workflow file itself; it is now done and does not need to be repeated.

**Correctness work this pass, beyond just adding the workflow** (GitHub Pages serves the app under `/academic-os/`, not the domain root, and has no server-side rewrite — unlike Netlify):
- `vite.config.ts`: `base` now derived from `VITE_BASE_PATH`, defaulting to `/` everywhere except the deploy build.
- PWA manifest `start_url`/`scope` now derive from `base` (were hardcoded to `/`); manifest icon `src` values made base-relative.
- `index.html` icon links use the `%BASE_URL%` placeholder instead of hardcoded absolute paths.
- `BrowserRouter` takes `basename={import.meta.env.BASE_URL}`.
- `public/404.html` + `src/app/githubPagesRedirect.ts` added: the standard GitHub Pages SPA deep-link pattern (re-encode the requested path, redirect to the app root, restore it via `history.replaceState` before React Router reads `location`). `BrowserRouter`'s clean URLs are kept — `HashRouter` was considered and rejected because it would have forced rewriting every `e2e/*.spec.ts` navigation and changed the app's URL scheme for no benefit over the well-established 404.html pattern.
- `index.html` gained a `<meta http-equiv="Content-Security-Policy">` and `<meta name="referrer">`, since GitHub Pages cannot send custom HTTP headers at all (§18 has the full gap analysis).

All of the above was verified against a real local production build at both the default base and the actual `/academic-os/` base (asset paths, manifest `start_url`/`scope`/icon `src`, index.html) before pushing, then re-verified against the actual deployed site (§21).

## 18. Security Controls — Deployment-Migration Recheck

Regression-checked against `SECURITY.md` specifically for what this pass touched:
- No unsafe HTML rendering introduced — `src/app/githubPagesRedirect.ts` only calls `URLSearchParams.get`/`history.replaceState` on `window.location`, never touches `innerHTML`/`dangerouslySetInnerHTML`. `public/404.html` only reads `window.location` and calls `window.location.replace` — no HTML-string construction, no user input rendered.
- **CSP moved from HTTP header (Netlify) to `<meta http-equiv>` (GitHub Pages can't send custom headers at all).** This is a real, deliberate, documented tradeoff, not an oversight — full gap analysis in `SECURITY.md` §6: `frame-ancestors`/`sandbox`/reporting directives don't work in meta CSP and were dropped rather than left in place implying false protection; `X-Content-Type-Options`, `Permissions-Policy`, and `X-Frame-Options` have no static-host equivalent at all and are accepted as lost, with a residual-risk rationale recorded (no cookies/auth/cross-origin embeds in this app). `script-src` stays `'self'`-only with no `'unsafe-inline'` addition — the 404-redirect logic was deliberately written as an ordinary bundled module (`githubPagesRedirect.ts`) rather than an inline `<script>` in `index.html` specifically so this didn't require weakening the policy.
- No secrets, credentials, or committed local academic/user data — confirmed via `git status`/`git diff` review before staging (§20); the repo-wide `netlify`/`Netlify`/`NETLIFY` audit performed at the start of this pass found no Netlify credential, token, site ID, or account info in any tracked file — only config/docs referencing Netlify as (former) hosting, now removed/updated.
- No new external network dependencies at runtime — no new production dependency was added this pass (`package.json` `dependencies` unchanged; only `version` was bumped).
- No unintended telemetry — the GitHub Pages deploy pipeline only uploads the static build artifact; no analytics/tracking was introduced anywhere.
- No AI/tool attribution metadata — checked via `grep -ril` for "claude"/"anthropic" across every changed/new file; clean. Commit `059fa15` is authored solely as `omar-issam-abdelhalim <omar.hq.eg@gmail.com>` (§20).
- `.claude/settings.local.json` (gitignored, never committed) had its two `netlify-cli` permission entries removed since they're no longer relevant — this is local tooling config, not part of the repository.

Still true from prior passes: no `dangerouslySetInnerHTML` anywhere in the codebase, no secrets (nothing needs one — fully static/local), `npm audit` unchanged (no new dependency was added this pass to introduce a new finding).

## 19. Dependencies Added and Why

**Initial pass:** `@fontsource/*` (self-hosted fonts — chosen over the Google Fonts CDN reference in Stage 1B specifically so the PWA works fully offline and needs no font-host CSP allowance; Latin-subset imports only, cutting the font payload from ~900KB to ~590KB total precache), `@types/node` (needed for `vite.config.ts`'s `node:url` import), and dev-only ESLint plugin peers pinned to compatible versions. `react-router-dom` is pinned to latest (7.18) rather than downgraded to dodge one advisory, because downgrading to the suggested "fixed" version actually landed in a range with *seven* unrelated CVEs — latest was the safer choice once actually checked, not assumed.

**Accessibility/responsive finalization pass (both dev-only):** `@playwright/test` — deterministic, real-browser E2E/responsive/PWA verification, added specifically because the interactive browser tool couldn't resize its viewport (§10); `@axe-core/playwright` — automated WCAG rule-checking integrated into the same E2E suite (§11), which is what actually found the real contrast defect this pass fixed. Neither ships in the production bundle.

**This deployment-migration pass:** no new dependency, dev or production. `netlify-cli` was never a `package.json` dependency (it was invoked ad hoc via `npx`), so removing Netlify required no `package.json` change beyond the version bump (§20).

## 20. Git Commits Created

Prior to this pass, six commits existed on `main` (Stage 0 and its finalization, the Stage 1A/1B docs commit, the initial Stage 2 implementation commit, and the accessibility/responsive finalization pass's two commits), all authored as `omar-issam-abdelhalim <omar.hq.eg@gmail.com>`:

4. `985f5eb` — `feat: Stage 2 engineering foundation, live UI system, PWA & CI` (the initial Stage 2 implementation commit)
5. `20ea573` — `fix: Stage 2 finalization - real mobile/PWA/a11y verification, fixture-boundary fixes` — Playwright E2E suite (151 tests), the `text/tertiary` contrast fix, fixture-boundary "Add ..." button fixes, CI workflow update. Passed locally on Windows but **failed on GitHub Actions' Linux runner** (see §16) due to two environment-dependent defects.
6. `1421f51` — `fix: resolve CI-discovered contrast defect and offline-test race` — fixes those two defects for real; CI run ([`30223267720`](https://github.com/omar-issam-abdelhalim/academic-os/actions/runs/30223267720)) fully green.
7. `ab880ed` — `docs: finalize Stage 2 report with real CI results and Netlify blocker` — the accessibility/responsive finalization pass's own report update, correctly identifying Netlify deployment as the one remaining gap.

This deployment-migration pass added one more, pushed to `origin/main` with the project owner's explicit authorization given in this task's prompt:

8. `059fa15` — `fix: replace Netlify with GitHub Pages as the permanent production host` — removes `netlify.toml` and all Netlify references from config; adds the GitHub Pages `deploy` job to `.github/workflows/ci.yml`; fixes `vite.config.ts`/`index.html`/`App.tsx`/`main.tsx` for correct base-path, manifest, and SPA-routing behavior under a GitHub Pages project-site subpath; adds `public/404.html` and `src/app/githubPagesRedirect.ts`; updates `README.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DEVELOPMENT.md`, `docs/ROADMAP.md`, `docs/STAGE_0_REPORT.md` (superseded-note, not rewritten), `CHANGELOG.md`, and `package.json` (`0.2.0` → `0.2.1`). CI run [`30225987789`](https://github.com/omar-issam-abdelhalim/academic-os/actions/runs/30225987789) fully green on the first attempt (§16), including the new `deploy` job.
9. This report-finalization commit (updating the remaining sections below to reflect the verified deployed state) — see the final chat response for its hash.

All commits authored solely under the project owner's repo-local Git identity (`omar-issam-abdelhalim <omar.hq.eg@gmail.com>`); no AI attribution anywhere (verified by grepping the full commit history, not just the new commits, for "claude"/"anthropic"). Local `main` tracks `origin/main` with a clean working tree confirmed after each push.

## 21. Production URL

**Live: <https://omar-issam-abdelhalim.github.io/academic-os/>**

GitHub Pages was enabled for the repository (Actions-sourced build, `build_type: workflow`) via the GitHub API, then the `deploy` job (§17) published the app there automatically on push. Verified for real in a Chromium browser against the actual deployed URL (not `vite preview`, not a simulation):

- Root URL and every asset (`assets/*.js`, `assets/*.css`, fonts, `manifest.webmanifest`, `icons/icon-192.png`, `sw.js`) return `200` under the `/academic-os/` path — confirmed via both `curl` and the browser's own network log.
- The app renders correctly (dark theme by `prefers-color-scheme`, since no explicit override was set yet) and, with no existing semester in a fresh browser profile, correctly redirects to `/academic-os/semester-setup`.
- Filling in the real Semester Setup form and submitting **wrote to real IndexedDB in production** — confirmed by the resulting `Year 2 · Semester 1` reading back correctly on the Settings screen, and the app landing on `/academic-os/home` with live-looking Home content.
- **Deep-link/refresh correctness (the specific risk this migration introduced) verified for real**: a cold direct navigation to `https://omar-issam-abdelhalim.github.io/academic-os/courses/course-csai101/units/unit-csai-l4` (never visited in that browser profile before, so no service worker could have cached it yet) rendered the correct Unit Detail screen on the first request — proof the `public/404.html` → `githubPagesRedirect.ts` mechanism works end-to-end in production, not just in theory. A subsequent hard refresh on that same URL also rendered correctly.
- `navigator.serviceWorker.getRegistrations()` showed the Academic OS service worker `activated` and scoped to exactly `https://omar-issam-abdelhalim.github.io/academic-os/` — correctly isolated from the account's other GitHub Pages PWA at `.../momentum/`, which is also registered in the same browser profile.
- `manifest.webmanifest` fetched from the live URL reports `start_url: "/academic-os/"`, `scope: "/academic-os/"`, and base-relative icon paths that all resolved — confirming the base-path fix (§17) is correct in the actual deployed artifact, not just the local build inspection done before pushing.
- No console errors and no failed network requests across every page visited (Home, Settings, Unit Detail, direct deep link, refresh).

**Not verified this pass, honestly:** the platform-native install-prompt UI itself was not clicked through (manifest/icon/SW prerequisites are confirmed correct, which is what installability actually depends on, but the OS-level "Install" affordance is a browser feature, not something to fake having tested); a real physical network disconnect (as opposed to Playwright's `context.setOffline`, already covered by the green E2E run in §16); and live mobile-viewport rendering in this session's interactive browser tool, which has the same pre-existing `resize_window`-doesn't-reliably-affect-layout limitation documented in `playwright.config.ts` and the prior finalization pass (§10) — responsive correctness for this exact commit is instead covered by the 151/151 Playwright suite, which does control viewport size deterministically and ran green in CI (§16).

## 22. Known Limitations (explicit, not hidden)

- Fixture state (tasks, attendance marks) is **per-screen-instance, not globally synced** — toggling a task on Home and revisiting Home later resets it, because each screen holds its own local copy of the fixture array rather than a shared store. This is intentional (fixtures are reference data, not a real store) but is a real, observed UX inconsistency worth knowing about, not a bug to silently ignore.
- Zod is installed but not yet used anywhere (no untrusted input exists yet to validate — Stage 3's Course/Unit forms and Stage 7's import will be the first real consumers).
- Command Palette is navigation-only; quick-add actions are deferred until the underlying creation flows are real (Stage 3+).
- Contrast-ratio verification is now done for the tokens axe's scan of Home/Courses/Settings/Tags actually exercised (one defect found and fixed — §11) — a full audit of every token pair against every background it can appear on is still not done (Stage 1B itself deferred this to its own Phase G).
- `npm audit` shows 14 advisories, all evaluated and accepted as non-applicable (§18) — not silently ignored, but also not eliminated, since doing so would require either a breaking downgrade that's demonstrably worse (react-router) or an ESLint major-version bump with unresolved peer conflicts (jsx-a11y chain).
- `<OfflineIndicator>`'s behavior under a *real* network disconnect (as opposed to Playwright's `context.setOffline`, which blocks requests but doesn't reliably flip `navigator.onLine` in this environment) has not been independently verified — see §14.
- Automated visual/layout verification (§10) is not a substitute for a human looking at the design on a real device — it catches breakage, not subjective polish.
- **GitHub Pages cannot send custom HTTP response headers.** `X-Content-Type-Options`, `Permissions-Policy`, and `X-Frame-Options`/`frame-ancestors` (clickjacking protection) — all previously sent by Netlify's `netlify.toml` — have no static-host equivalent and are not replicated. A `<meta http-equiv="Content-Security-Policy">` covers most of the CSP itself, but not `frame-ancestors`. This is a deliberate, accepted tradeoff of static-only hosting with no backend, with a residual-risk rationale recorded in `docs/SECURITY.md` §6 — not a silently dropped control.
- The platform-native PWA install-prompt UI was not clicked through on the live production URL this pass (§21) — the manifest/icon/service-worker prerequisites installability actually depends on are verified, but the OS-level "Install" affordance itself was not.
- Live mobile-viewport rendering was not independently re-confirmed via this session's interactive browser tool against the production URL — that tool has the same pre-existing `resize_window` limitation noted in §10 and `playwright.config.ts`. Deterministic responsive coverage for this exact commit comes from the 151/151 Playwright suite instead (§16, §21).

## 23. Explicit Stage 3 Boundary

Not implemented, and not attempted: production Course/Unit/Content-Block/Task/Schedule/Grade/Practice CRUD backed by real repositories (only Preferences, Tags, and Semester lifecycle are real); the Markdown editor/sanitizer library selection for Text blocks (the safe *renderer* exists — see §18 — but there's no *editor* yet, by design); real attachment/Blob upload and storage; the full grade-calculation engine (required-score math, boundaries application); real analytics computation; semester archive/media export generation; import; and any notification scheduling beyond the in-app static copy in Settings. Fixture data (`src/fixtures/`) is never written to Dexie and is clearly commented as reference-only everywhere it's used.

**This finalization pass additionally audited every "Add ..." button across the reference UI for the specific failure mode the brief called out in §5 — a control that silently does nothing when clicked, which looks broken rather than honestly signaling a Stage 3 boundary.** Found and fixed: "Add course" (Courses), "Add unit" (Course Detail), "Add grade"/"Add course structure" (Grades), "Add practice score" (Practice) had no `onClick` handler at all. Each now shows an explicit, dismissable-by-navigation inline message ("Creating courses arrives in Stage 3 — this button is a reference placeholder for now.") on click, matching the pattern already used by the Semester End export buttons. No new functionality was added — this is strictly making the existing Stage 2 boundary honest, not moving it.

## 24. Verification Checklist

- [x] `npm install` — clean
- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean
- [x] `npm run format:check` — clean
- [x] `npm test` — 43/43 passing (unit/integration/component)
- [x] `npm run test:e2e` — **151/151 passing** (responsive × 7 viewports, accessibility incl. automated axe scan, PWA/offline) — new this pass
- [x] `npm run build` — succeeds, PWA assets generated
- [x] App starts and routes work (verified in a real Chromium browser, both via manual `vite preview` browsing and the full Playwright suite)
- [x] Deep link / refresh behavior — verified via direct URL navigation to nested routes (`/courses/:id?section=grades`, `/data/new-semester`, etc.) working correctly on load, not just client-side navigation
- [x] Responsive shell — **now verified across 7 viewports (320–1440px) via Playwright**, not just the one width the manual browser tool could reach (§10)
- [x] Light and dark themes — both verified live, instant switch, persisted
- [x] Representative UI — extensively verified live (manual pass) and via the E2E suite (automated pass) across every screen in the Stage 1A inventory
- [x] No console errors observed during manual verification; E2E suite additionally asserts no unhandled navigation/render failures across all 151 checks
- [x] Dexie initializes correctly; database boundaries match architecture (confirmed via Tag persistence surviving across screens, the real storage-usage readout, and a dedicated E2E offline-reload test reading Dexie data with the network blocked)
- [x] No fixture data leaks into Dexie (`src/fixtures/` never imports `src/data/`)
- [x] No UI element silently no-ops instead of honestly signaling the Stage 3 boundary — audited and fixed this pass (§23)
- [x] Storage errors have safe propagation (`storageErrors.ts`, not independently fault-injected)
- [x] Manifest valid, icons present at required sizes including a maskable variant — **verified via automated E2E checks**, not just visual inspection
- [x] Service worker installs and the "prompt" update flow works — verified live (real rebuild + banner + click-to-update) and via E2E (`activated` state, precache contents)
- [x] Offline: app shell **and** Dexie-backed data verified to survive a real network-blocked reload — new this pass (§14)
- [x] Keyboard navigation, focus-visible, dialog focus trap/restore, no keyboard traps, accessible names — verified via E2E (§11)
- [x] Automated accessibility scan (axe-core) of 4 representative pages — one real defect found and fixed (§11)
- [ ] Installability formally checked via a browser's actual install-prompt UI — not attempted (manifest/icon/SW prerequisites are verified live in production; the platform-native install affordance itself was not clicked through — §21)
- [x] CI workflow file is valid YAML, includes both the `quality` and `deploy` jobs, and mirrors the exact local commands that all pass
- [x] CI has run on GitHub for real, twice: the accessibility/responsive pass's first run on `20ea573` failed on two genuine, environment-only defects (§16), fixed in `1421f51` ([`30223267720`](https://github.com/omar-issam-abdelhalim/academic-os/actions/runs/30223267720), fully green); this deployment-migration pass's run on `059fa15` ([`30225987789`](https://github.com/omar-issam-abdelhalim/academic-os/actions/runs/30225987789)) passed both `quality` and `deploy` on the first attempt
- [x] Local `main` pushed to `origin/main`; tracking confirmed, working tree clean, no force-push/history rewrite
- [x] **Netlify fully removed**: `netlify.toml` deleted, no Netlify reference remains anywhere except historical record (STAGE_0_REPORT.md, CHANGELOG.md) explicitly marked superseded; repo-wide credential/secret audit found nothing to redact
- [x] **GitHub Pages deployed and live**: <https://omar-issam-abdelhalim.github.io/academic-os/> — verified via `curl`, direct browser navigation, a real semester-creation write to production IndexedDB, a cold deep-link load, and a hard refresh on a deep route (§21)
- [x] Documentation updated and internally consistent (README, ARCHITECTURE, SECURITY, DEVELOPMENT, ROADMAP, STAGE_0_REPORT, CHANGELOG, this report)

## 25. Recommendation

Engineering quality for Stage 2 is **fully green and complete, including production deployment**: real cross-viewport responsive verification (151 Playwright tests, 320–1440px), real offline/PWA verification, an automated accessibility scan that found and fixed two genuine WCAG AA contrast defects, a fixture-boundary honesty audit and fix, a full green run of typecheck/lint/format/unit tests/build/E2E both locally and on GitHub Actions, and — closing the one gap the prior finalization pass left open — a complete migration off Netlify onto a permanent GitHub Pages + GitHub Actions deployment pipeline, verified against the real, live production URL rather than just a local build. Four commits since the last report (`ab880ed` → `059fa15` → this one) are pushed to `origin/main` under the project owner's Git identity with no AI attribution.

The two items in §24 left unchecked (native install-prompt UI click-through; live mobile-viewport re-verification in this session's browser tool) are both explicitly non-blocking: their underlying technical prerequisites are independently verified by other means (manifest/SW correctness for the former, the 151-test Playwright suite for the latter), and both were already documented as tool/scope limitations, not defects, in the prior finalization pass.

**STAGE 2 — APPROVED.** No code, test, deployment, or documentation follow-up is outstanding. Owner action required: none.

The single remaining gap is **external to the engineering work**: Netlify deployment cannot proceed without the project owner completing an interactive login (`netlify login`, or connecting the repo at app.netlify.com) — this cannot be performed on their behalf and is not an engineering defect.

**STAGE 2 BLOCKED — OWNER ACTION REQUIRED**, solely for Netlify authentication. No code, test, or documentation follow-up is outstanding. Once the project owner runs `netlify login` (or links the GitHub repo via the Netlify dashboard) and confirms, deployment can be completed and this report updated with the resulting production URL — at which point Stage 2 should be considered ready for unconditional approval.
