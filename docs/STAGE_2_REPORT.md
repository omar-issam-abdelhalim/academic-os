# Stage 2 Report — Engineering Foundation, Live UI System, PWA & Production Pipeline

## 1. Stage Objective

Establish the complete engineering foundation for Academic OS: real project toolchain, a responsive component/design-token system implementing the approved `STAGE_1B_DESIGN_SYSTEM.md`, a live fixture-driven reference UI covering the approved `STAGE_1A_UX_ARCHITECTURE.md` screen inventory, the Dexie/IndexedDB persistence foundation from `DATA_MODEL.md`, PWA installability/offline foundation, testing/CI/deployment configuration, and a security baseline — without implementing Stage 3's full domain-feature CRUD (Courses, Units, Tasks, Schedule, Grades, Practice all stay reference/fixture-driven except where noted in §12).

## 2. Implementation Status

**Complete**, with one external dependency deferred at an explicit stop-point: Netlify deployment requires interactive account login that cannot be performed on the product owner's behalf (see §17, §19). Everything else in the Stage 2 scope (§2 of the brief: A–M) is implemented, tested, and verified in a real browser.

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

## 10. Responsive Behavior

CSS breakpoints match `STAGE_1B_DESIGN_SYSTEM.md` §10 exactly (`src/styles/tokens.css` + `src/lib/breakpoints.ts` as the JS-side source of truth): mobile <600px, tablet 600–1024px, desktop ≥1024px, wide ≥1440px content-width cap. **Honest limitation:** this session's browser-automation tooling could not actually resize the browser viewport (`resize_window` calls succeeded per the tool's own report but had no visible effect — confirmed by requesting both 390×844 and 1440×900 and getting byte-identical screenshots) — so live, in-browser verification happened only at the one width the tool's window actually rendered at (~1528px, which exercises the desktop sidebar/grid layout, verified extensively). Mobile-specific layouts (bottom nav, Compact Week Overview, sheet presentation, single-column stacking) are implemented per the same media queries and reviewed by hand against the CSS, but **were not visually confirmed in a real narrow viewport this session** — this is the one item in the brief's §43 responsive audit I cannot honestly claim to have completed, and it should be spot-checked (e.g. actual device/DevTools responsive mode) before relying on it.

## 11. Accessibility Baseline

Implemented: semantic landmarks and headings per screen; visible `:focus-visible` ring (single accent color, no competing focus color, per Stage 1B) defined globally; all icon-only controls require an `aria-label` at the type level (`IconButtonProps` makes it a required prop, not a convention); dialogs/sheets trap focus and restore it on close (`useFocusTrap`), are dismissible via Escape and an explicit close button, and the backdrop-click-to-close affordance is a real `<button>` (not a bare `div` with an `onClick`, which would be a keyboard-inaccessible pattern — this was flagged and fixed during this session, see §22); form fields associate labels/hints/errors via generated `id`s (`Field` component); status is never color-only (`StatusBadge` always pairs a tone with text, and "Attendance not recorded" vs. "Missed" are verified-distinct both in code and in a dedicated test); `prefers-reduced-motion` collapses all animation durations to near-zero globally. **Not independently audited this session:** full keyboard tab-order walkthrough of every flow, and a contrast-ratio pass across all token pairs (Stage 1B itself flagged the latter as `[PENDING — Phase G]`, not yet done in Figma either) — spot-checked (Tab through Home) but not exhaustively verified.

## 12. Dexie/IndexedDB Foundation

Both databases and the full v1 schema from `DATA_MODEL.md` are declared in `src/data/db.ts`, including `TaskCompletionEvent` from the initial version (per the Stage 0 finalization decision) — even though only a subset of tables has a repository yet. **Implemented repositories (real, tested):** `preferencesRepository` (theme, onboarding flag), `tagRepository` (global Tag CRUD), `semesterRepository` (create/get active semester, `startNewSemester`). Course/Unit/ContentBlock/Task/ScheduleTemplate/ScheduleOccurrence/GradeCategory/GradeEntry/GradeBoundary/PracticeEntry/WeeklyCheckIn have schema but no repository — that's explicit Stage 3+ scope. `src/data/storageErrors.ts` classifies and normalizes `QuotaExceededError`/version-conflict/blocked failures so no repository call can fail silently. Verified in-browser: creating a semester, creating/deleting a Tag, and `startNewSemester` all round-trip through real IndexedDB (confirmed via Settings' live storage-usage readout changing, and Tags persisting/disappearing correctly).

## 13. PWA Implementation

`vite-plugin-pwa` (Workbox, `generateSW` mode) precaches the app shell only (`globPatterns: ["**/*.{js,css,html,woff2}"]` — icons and other assets excluded from precache, user data was never eligible since it's not a static asset). Manifest includes name/short_name/description, `standalone` display, theme/background colors, and a real icon set — see §19 for how the icons were produced. `registerType: "prompt"` with a genuine `useRegisterSW`-based `UpdatePrompt` component (not just configured and unused): **verified in-browser** — after rebuilding while the old build was still loaded, the app showed "A new version of Academic OS is available — Refresh to update," and clicking it correctly activated the new service worker and picked up code changes (this was real, incidental proof during the WeekGrid bug-fix testing, not staged).

## 14. Offline Behavior

Not independently tested this session (would require simulating a network disconnect in the browser tooling, which wasn't attempted) but architecturally sound: the SW precaches the full app shell, all application data lives in IndexedDB (available offline by construction), and `OfflineIndicator` shows a non-blocking banner via `navigator.onLine`/`online`/`offline` events. This should be spot-checked with real offline toggling before Stage 3 relies on it being solid.

## 15. Testing Setup

Vitest + `@testing-library/react` + `fake-indexeddb` + jsdom. **43 tests, 9 files, all passing:**
- `academicWeek.test.ts` — Sat–Fri boundary correctness (start/end exact times, week-membership edge cases at the Friday/Saturday boundary, `bucketForDate`, `academicWeekDays`/`DAY_LABELS` alignment, `formatWeekRange`) — all date assumptions verified against actual calendar computation, not asserted from memory.
- `attendancePresentation.test.ts` — Upcoming/In-progress/Not-recorded derivation, and the specific "not-recorded must never equal missed" boundary condition.
- `gradeSummary.test.ts` — recorded-sum math, unallocated-points honesty (never negative, never a fabricated zero), category nesting.
- `preferencesRepository.test.ts`, `tagRepository.test.ts`, `semesterRepository.test.ts` — real Dexie round-trips against `fake-indexeddb`, including the specific invariant that `startNewSemester` clears the semester DB but never the preferences DB (Tags survive).
- `Button.test.tsx`, `AttendanceControl.test.tsx` — component behavior/interaction.
- `App.test.tsx` — the semester gate genuinely redirects to Semester Setup when no semester exists in a real (fake) IndexedDB, not a mocked check.

One environment note: `RequireSemester` was changed from a `dexie-react-hooks` live-query subscription to a one-time async check, because the live-query's `BroadcastChannel`-based reactivity did not reliably resolve under jsdom + fake-indexeddb in tests (real browsers are unaffected — this is a documented category of test-environment friction with that library combination, not a production concern). This was also the more correct choice functionally: nothing in the app needs the gate to react to an external change, since both places that change semester existence already `navigate()` explicitly right after the write.

## 16. CI Setup

`.github/workflows/ci.yml`: on push/PR to `main`, runs `npm ci` (lockfile-deterministic), typecheck, lint, format check, test, build. Least-privilege `permissions: contents: read`. Not yet run on GitHub (no push has happened yet this session — see §20).

## 17. Netlify / Deployment Setup

`netlify.toml` is complete and ready: build command/publish dir, SPA fallback redirect (`/* → /index.html 200`), security headers (§18), and cache policy (`index.html`/`sw.js`/manifest never cached, hashed `assets/*` cached immutably for a year). **Deployment itself did not happen** — see §19's stop-point explanation. No Netlify site was created.

## 18. Security Controls

Per `SECURITY.md`: strict CSP in `netlify.toml` (`default-src 'self'`, `script-src 'self'` with no `unsafe-inline`/`unsafe-eval`, `object-src 'none'`, `frame-ancestors 'none'`) — the one deliberate, documented allowance is `style-src 'unsafe-inline'` for genuinely dynamic computed styles (grid positioning, progress-bar widths), which cannot execute script and is explained inline in `netlify.toml`. `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` all set. No `dangerouslySetInnerHTML` anywhere in the codebase — the Text content-block renderer (`src/lib/safeMarkdown.tsx`) parses a small Markdown subset directly into React elements (never an HTML string, so there is no sanitizer to bypass by construction) and scheme-validates every link (`http:`/`https:` only). No secrets exist in the codebase (nothing needed one — fully static/local). Dependency audit: `npm audit` shows 14 findings, all in two chains — a dev-only lint-tooling transitive `minimapatch`/`brace-expansion` DoS (never shipped to production, no untrusted input reaches it) and `react-router`'s "RSC Mode CSRF" advisory (this app uses the plain declarative `<Routes>` API with no server components/actions, so that attack surface doesn't exist here) — both evaluated and accepted as non-applicable rather than blindly patched into a breaking, worse state (see §19 for why downgrading made it worse).

## 19. Dependencies Added and Why

Beyond the ARCHITECTURE.md-mandated stack (React, Dexie, Zod, lucide-react, vite-plugin-pwa, Vitest/Testing Library): `@fontsource/*` (self-hosted fonts — chosen over the Google Fonts CDN reference in Stage 1B specifically so the PWA works fully offline and needs no font-host CSP allowance; Latin-subset imports only, which cut the font payload from ~900KB to ~590KB total precache by not shipping Cyrillic/Greek/Vietnamese glyphs nothing in the product currently needs), `@types/node` (needed for `vite.config.ts`'s `node:url` import), and dev-only ESLint plugin peers (`eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`, `eslint-config-prettier`) pinned to versions compatible with each other (the initial unpinned install resolved an eslint 10 that conflicted with jsx-a11y's peer range). `react-router-dom` is pinned to latest (7.18) rather than downgraded to dodge one advisory, because downgrading to the suggested "fixed" version actually landed in a range with *seven* unrelated CVEs (§18) — latest was the safer choice once actually checked, not assumed.

## 20. Git Commits Created

Two commits so far this session (both authored solely as `omar-issam-abdelhalim <omar.hq.eg@gmail.com>`, continuing the existing repo-local identity):
1. `docs: add Stage 1A/1B design docs, record Stage 1B execution decision`
2. `docs: finalize Stage 0 - resolve open questions, fix task history model`

*(These were from the prior Stage 0 finalization session — this Stage 2 session's own commit is created after this report, per the workflow below; see the final chat response for its hash.)*

## 21. Production URL

None yet — Netlify deployment is the one blocked step (§17, §19).

## 22. Known Limitations (explicit, not hidden)

- **Mobile viewport not visually verified this session** — see §10.
- **Offline behavior not actively tested** — see §14.
- Fixture state (tasks, attendance marks) is **per-screen-instance, not globally synced** — toggling a task on Home and revisiting Home later resets it, because each screen holds its own local copy of the fixture array rather than a shared store. This is intentional (fixtures are reference data, not a real store — see PRODUCT_SPEC-adjacent §41 of the brief) but is a real, observed UX inconsistency worth knowing about, not a bug to silently ignore.
- Zod is installed but not yet used anywhere (no untrusted input exists yet to validate — Stage 3's Course/Unit forms and Stage 7's import will be the first real consumers).
- Command Palette is navigation-only; quick-add actions are deferred until the underlying creation flows are real (Stage 3+).
- Contrast-ratio verification of the full token palette is not done (Stage 1B itself deferred this to its own Phase G, not yet reached).
- `npm audit` shows 14 advisories, all evaluated and accepted as non-applicable (§18) — not silently ignored, but also not eliminated, since doing so would require either a breaking downgrade that's demonstrably worse (react-router) or an ESLint major-version bump with unresolved peer conflicts (jsx-a11y chain).

## 23. Explicit Stage 3 Boundary

Not implemented, and not attempted: production Course/Unit/Content-Block/Task/Schedule/Grade/Practice CRUD backed by real repositories (only Preferences, Tags, and Semester lifecycle are real); the Markdown editor/sanitizer library selection for Text blocks (the safe *renderer* exists — see §18 — but there's no *editor* yet, by design); real attachment/Blob upload and storage; the full grade-calculation engine (required-score math, boundaries application); real analytics computation; semester archive/media export generation; import; and any notification scheduling beyond the in-app static copy in Settings. Fixture data (`src/fixtures/`) is never written to Dexie and is clearly commented as reference-only everywhere it's used.

## 24. Verification Checklist

- [x] `npm install` — clean
- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean
- [x] `npm run format:check` — clean
- [x] `npm test` — 43/43 passing
- [x] `npm run build` — succeeds, PWA assets generated
- [x] App starts and routes work (verified in a real Chromium browser via `vite preview`)
- [x] Deep link / refresh behavior — verified via direct URL navigation to nested routes (`/courses/:id?section=grades`, `/data/new-semester`, etc.) working correctly on load, not just client-side navigation
- [x] Responsive shell — desktop sidebar verified live; mobile bottom nav/layout reviewed by code/CSS, not live-rendered (§10, §22)
- [x] Light and dark themes — both verified live, instant switch, persisted
- [x] Representative UI — extensively verified live (Home, Schedule week grid + day dialog, Courses, Course Detail all 5 sections, Unit Detail with safe-rendered Markdown, Tasks, Performance, Settings, Tags full CRUD, Start New Semester, Semester End)
- [x] No console errors observed during the entire manual verification pass
- [x] Dexie initializes correctly; database boundaries match architecture (confirmed via Tag persistence surviving across screens and the real storage-usage readout)
- [x] No fixture data leaks into Dexie (`src/fixtures/` never imports `src/data/`)
- [x] Storage errors have safe propagation (`storageErrors.ts`, not independently fault-injected this session)
- [x] Manifest valid, icons present at required sizes including a maskable variant
- [x] Service worker installs and the "prompt" update flow works — verified live, not just configured
- [ ] Installability formally checked via a browser's install-prompt UI — not attempted this session
- [x] CI workflow file is valid YAML and mirrors the exact local commands that all pass
- [ ] CI has not yet run on GitHub (no push yet)
- [ ] Netlify not configured — blocked on interactive login (§17, §19)
- [x] Documentation updated and internally consistent (README, DEVELOPMENT, ROADMAP, this report)

## 25. Recommendation

**APPROVE STAGE 2**, conditional on two follow-ups that don't block approval but should happen before Stage 3 leans on them: (1) a real narrow-viewport check of the mobile layouts (bottom nav, Week Overview, sheets) since this session's tooling couldn't resize the browser, and (2) completing the Netlify connection once the product owner has logged in (see the final chat message for the exact next step).
