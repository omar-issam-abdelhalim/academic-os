# Stage 4 Report — Academic Analytics, Trends & Actionable Intelligence

> **Status: complete.** This report covers the Stage 4 task prompt's scope — deterministic academic analytics on top of Stage 3's real persistence. See `docs/ROADMAP.md`'s "Stage 4 (continued)" entry for the documented mapping of this work onto the original, more granular roadmap (it pulls the original Stage 6 — Analytics & Semester Intelligence — forward, on the product owner's explicit instruction, the same kind of scope redefinition Stage 3 already documented once).

## 1. Objective

Convert Academic OS's Performance screen from Stage 3's honest-but-shallow "real current totals, no trends" placeholder into a genuine, deterministic analytics product: semester/course metrics, trend classification, and an explainable insight engine — computed entirely client-side from real Stage 3 data, never from an AI model, never randomly, never from fixtures.

## 2. Scope Note (documented, not silently improvised)

The Stage 4 task prompt's own §12 ("Course Detail Integration") and §13 ("Home Integration") describe fuller in-context analytics surfaces than `docs/STAGE_1A_UX_ARCHITECTURE.md` — the approved, authoritative UX architecture — actually allows. STAGE_1A is explicit on two points that predate this prompt and were not re-opened by it:

- **§G (Home):** "Explicitly NOT on Home: Grade charts, practice charts, attendance percentage widgets, semester trend graphs… Analytics of any kind… At most, once enough data exists, Home may show one plain-text weekly stat… text, not a chart."
- **§H (Course Detail):** "No Analytics tab inside Course Detail in v1 — course-level trend data lives in the Performance Hub, filterable by course."

Per this prompt's own §1 instruction ("if this prompt conflicts with an established architectural or UX decision from Stages 0–3, preserve the established decision unless changing it is objectively required for correctness"), both are honored as-is: Home gets exactly one plain-text, top-priority insight line (no widget, no chart), and Course Detail gets a link into Performance's course filter rather than its own analytics tab. This reconciliation is recorded here rather than picked silently.

## 3. Repository Changes

New: `src/domain/analytics/` (8 modules + 8 test files), `src/features/shared/useAnalytics.ts` (+ integration test), `src/features/performance/TrendChart.tsx`, `src/features/performance/InsightCard.tsx` (+ their CSS modules), `e2e/analytics.spec.ts`. Rewritten: `src/features/performance/PerformanceScreen.tsx` (+ CSS). Modified: `src/features/home/HomeScreen.tsx`, `src/features/courses/CourseDetailScreen.tsx` (+ their CSS), `package.json` (Recharts), `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `README.md`, `CHANGELOG.md`, version references. No Stage 3 repository, schema, or domain file was rewritten — Stage 4 is additive on top of Stage 3, per this prompt's own "no regressions" requirement.

## 4. Analytics Architecture

```
UI (PerformanceScreen, HomeScreen, CourseDetailScreen)
   ↓ reads via
useSemesterAnalytics() / useInsights(limit) — src/features/shared/useAnalytics.ts
   (useLiveQuery over courses/tasks/taskCompletionEvents/scheduleOccurrences/
    gradeEntries/practiceEntries, fed through the pure domain layer via useMemo)
   ↓ computed by
src/domain/analytics/*.ts — pure functions, zero Dexie access, fully unit-tested
```

Every metric flows through exactly one function (`computeTaskMetrics`, `computeAttendanceMetrics`, `computeGradeMetrics`, `computePracticeMetrics`, each with a `*ByCourse` variant), so Performance, Home, and Course Detail can never disagree about what a number means. `computeCourseAnalytics` and `computeSemesterAnalytics` compose these per course and semester-wide respectively. `generateInsights` consumes the finished `SemesterAnalytics` snapshot and never touches raw entities directly.

## 5. Metric Definitions

| Metric | Definition | "No data" semantics |
|---|---|---|
| Task completion rate | `completed / totalRelevant × 100` over the tasks in scope (course or semester) | `undefined` (not 0%) when `totalRelevant === 0` |
| Overdue count | Incomplete tasks with a due date strictly before now (`academicWeek.ts`'s existing `isOverdue`) | Always a real integer (0 is a real, meaningful answer here — no tasks *are* overdue) |
| Recent/prior-week completions | Count of `TaskCompletionEvent(toggledTo: true)` in the last 7 days vs. the 7 days before that — a two-window comparison, not a formal trend (task volume is too low/noisy for that) | 0 is real |
| Attendance rate | `attended / (attended + missed) × 100` — `cancelled`/`unmarked` excluded from the denominator entirely (PRODUCT_SPEC.md §8 / Cross-Cutting Invariant #6) | `undefined` when `attended + missed === 0` |
| Weekly attendance trend point | Per-academic-week attendance rate (same exclusion rule), one point per week that has ≥1 attended/missed occurrence | Weeks with only cancelled/unmarked occurrences contribute no point |
| Grade performance percent | `Σ scoreEarned / Σ scoreMax × 100` across recorded `GradeEntry` rows in scope — identical formula for Simple and Structured Mode, since both are just "GradeEntry rows" (reuses Stage 3's `sumRecorded`/`currentPerformancePercent`) | `undefined` when nothing is recorded — never a fabricated 0% |
| Grade trend point | Each entry's own `scoreEarned/scoreMax` percentage, ordered by `recordedAt` | Entries with `scoreMax === 0` are excluded (no divide-by-zero) |
| Practice normalized percent / trend | Identical shape to grades, over `PracticeEntry` — a structurally separate module, never combined with grade data (PRODUCT_SPEC.md §12) | Same "undefined, not 0%" rule |
| Semester-wide rate (any dimension) | Always a **ratio of sums** (e.g. total completed / total relevant across every course) — never an average of each course's own percentage, which would misweight a 2-task course the same as a 40-task course | See `semesterAnalytics.test.ts`'s explicit small-vs-large-course test |
| Course profile | `{ tasks, attendance, grades, practice }` — four independent dimensions, deliberately **no blended "course score"**; inventing weights (e.g. 40/20/20/20) would be an arbitrary, undocumented judgment this stage's own rules forbid | N/A |

## 6. Trend Rules

`src/domain/analytics/trend.ts`'s `classifyTrend`: requires **≥4** chronologically distinct points or returns `"insufficient-data"`; otherwise splits the series into an earlier and later half, compares averages, and classifies `"improving"`/`"declining"` only if the change is **≥5 points** in that direction, else `"stable"`. Both constants (`MIN_POINTS_FOR_TREND`, `STABLE_THRESHOLD`) are exported, documented, and directly exercised by `trend.test.ts` (insufficient-data, improving, declining, stable, out-of-order input, Date-vs-string input). Applied to weekly attendance rate, per-entry grade percent, and per-entry practice percent — never to task completion (too low-N per week to be meaningful; task analytics uses the simpler two-window comparison instead, an explicit, documented scope choice).

## 7. Insight Rules

`src/domain/analytics/insights.ts` — 8 bounded rules, each contributing **at most one** insight (comparative rules pick the single most notable course, never one insight per course per dimension, so the result is structurally incapable of flooding):

1. **Onboarding** (only when there is zero data of any kind — returned alone, short-circuits every other rule)
2. **Overdue workload** (attention, semester-wide count)
3. **Weakest task completion** (attention; only courses with ≥3 tasks and a rate <60% are eligible)
4. **Weakest recorded grade** (attention; only courses with ≥2 grade entries and <70% are eligible)
5. **Most notable declining trend** across every course × {attendance, grades, practice} (attention; picks the single most-negative delta)
6. **Strongest recorded grade** (positive; ≥85%)
7. **Most notable improving trend** (positive; picks the single most-positive delta)
8. **Consistency** (positive; ≥5 tasks and ≥90% completion)
9. **Insufficient grade-history guidance** (info; only when grades exist but haven't reached the trend threshold)

Ranked `attention > positive > info`; callers slice the ranked list (`Home: 1`, `Performance: 6`). Every insight carries a plain-language `message` and a numeric `evidence` string a student can check by hand. Language is factual and neutral throughout — no "at risk," no predicted grades, no causal claims, matching PRODUCT_SPEC.md §13 exactly.

## 8. UI Changes

- **Performance**: semester overview (4 stat cards, each showing "No data yet" instead of a fabricated 0%), 3 trend line charts (Recharts, never rendered from <2 points, each paired with a plain-text numeric summary so no information is tooltip-only), a per-course comparison table (`role="table"`), and a ranked insight list. A course-filter `<select>` (synced to `?course=`) re-scopes the overview/trends to one course.
- **Home**: one plain-text insight line below the task list (icon + text, never color-only), suppressed when the top insight is the generic onboarding filler (Home already has its own course-empty-state). Clicking it opens Performance.
- **Course Detail**: a "View analytics for this course →" link under the header, opening `/performance?course=<id>`.

## 9. Testing Performed

**Unit/integration (Vitest):** 42 new tests across 9 files (`trend`, `taskAnalytics`, `attendanceAnalytics`, `gradeAnalytics`, `practiceAnalytics`, `courseAnalytics` (via `semesterAnalytics.test.ts`), `semesterAnalytics`, `insights`, `useAnalytics`) — **151 total, up from 149** (2 of the 42 are the real-Dexie integration test in `useAnalytics.test.tsx`, the rest are pure-function tests with real math assertions, not snapshots). Covers: zero data, one record, zero denominators, both grade modes, mixed course sizes, task-completion-history respecting semantics, all four attendance statuses, practice normalization, all four trend classifications, insight ranking/dedup/flooding-prevention, and reactive updates after real repository writes (create/delete a grade entry, complete a task).

**E2E (Playwright):** new `e2e/analytics.spec.ts` — a full golden path: create a course, 3 tasks (2 complete, 1 overdue), mark attendance, add 2 grade entries and 1 practice entry, open Performance and verify the exact calculated numbers, verify the course-comparison row, verify the overdue insight, follow Course Detail's analytics link and verify the filtered view, complete the overdue task and verify both the stat and the insight update, check Home's insight line, and verify everything survives a reload. The full existing suite (`workflow.spec.ts`, `responsive.spec.ts`, `accessibility.spec.ts`, `pwa.spec.ts`) was re-run in full afterward to check for regressions from the Home/Course-Detail/Performance changes.

## 10. Test Counts

| Gate | Result |
|---|---|
| `npm run typecheck` | Clean |
| `npm run lint` | Clean (0 errors, 0 warnings) |
| `npm run format:check` | Clean |
| `npm test` (Vitest) | **151/151 passing** |
| `npm run build` | Succeeds (Performance's lazy-loaded chunk includes Recharts, ~103 KB gzipped — does not affect the main bundle) |
| `npm run test:e2e` (Playwright, full suite) | **158/158 passing** (6 workflow + 136 responsive + 15 a11y/PWA + 1 new analytics golden path) — zero regressions from Stage 4's Home/Course-Detail/Performance changes |

## 11. CI Result

*(Recorded in the final chat response, after push.)*

## 12. Production Verification

*(Recorded in the final chat response, after a green CI run — a real create → persist → analyze → modify → re-analyze cycle against the live production URL.)*

## 13. Known Limitations

- Task analytics uses a simple two-window recent-activity comparison rather than the formal `classifyTrend` — a deliberate choice (weekly task counts are too low-N/noisy for a half-vs-half average comparison to be meaningful), not an oversight.
- The insight engine's thresholds (60%/70%/85%/90%, ≥3/≥5 tasks, ≥2 grade entries) are reasonable, documented, hand-picked defaults — not tuned against real longitudinal student data (none exists yet for a brand-new local-first app). They are trivially adjustable constants, not embedded magic numbers.
- No "required score to reach a target" surfaced in the analytics UI itself (the underlying `requiredScoreForTarget` function has existed since Stage 3 and remains unused by Stage 4's UI) — an explicit, bounded scope choice, not a gap in the math.
- Recharts adds a non-trivial gzipped chunk to the (lazily-loaded, route-split) Performance screen specifically — it does not affect the main bundle or any other route's load time.

## 14. Explicitly Deferred

Consistent with the Stage 4 prompt's own out-of-scope list: notification engine, AI/LLM integration of any kind, cloud sync, authentication, collaboration features, Import, Media Export, unrelated security hardening, unrelated design-system changes, and anything belonging to a later stage.

## 15. Final Decision

*(Recorded in the final chat response, after CI/production verification.)*
