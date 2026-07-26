# Stage 1A — Information Architecture & UX Flows
### Academic OS — UI/UX & Figma Design, Sub-Stage 1A
Status: **APPROVED.** Architecture only — no visual design, no Figma screens, no production code. Stage 1B may begin only on your explicit go-ahead.
 
---
 
## 0. Revision Log — Product-Owner Decisions Applied in This Revision
 
This revision incorporates your review of the original Stage 1A proposal. Nothing in Stage 0 was altered — every change below is a Stage 1A (UX/IA) decision made within Stage 0's existing rules.
 
**Resolved decisions (previously open, now confirmed):**
1. **Course code** — Stage 0 rule stands unchanged: course name required, course code optional (PRODUCT_SPEC.md §3, Cross-Cutting Invariant #1). The original Stage 1A brief's "required course code" was a drafting error, not an intended product change; no Stage 0 document was touched.
2. **Grade mode mechanism** — the proposed emergent Simple → Structured model (§L) is approved as written.
3. **Top-level IA** (§B–D) — approved as written: Home/Tasks/Schedule/Courses primary on mobile, Performance promoted into the desktop sidebar, Grades/Practice/Analytics kept off primary mobile nav.
4. **Course Detail architecture** (§H) — approved as written: Units-default + compact secondary navigation, no Analytics section in v1.
5. **No global search in v1** (§R) — approved, revisit condition retained unchanged.
6. **No global FAB** (§Q) — approved; contextual add actions + desktop Command Palette confirmed.
7. **Pre-semester Settings access** (§S) — approved: basic preferences remain reachable before a semester exists; semester-dependent functionality stays gated until Semester Setup is complete.
**Required revisions incorporated (new direction from you):**
- **Revision A — Mobile Schedule:** replaced the original day-only agenda with a **Compact Week Overview → Day Detail** hybrid, so the mobile Schedule preserves the "whole week at a glance" mental model (§C, §E, §F, §K, flows #12–14).
- **Revision B — Attendance state/timing:** replaced the "control only appears after class ends" model with an **Upcoming → In Progress → Attendance not recorded (if still unmarked after class ends)** model. Attended can now be marked the moment a class starts; the app never infers Missed from elapsed time alone (§K, §T, §U, flows #13–14).
- **Revision C — Home/Schedule coherence:** Home now prioritizes an in-progress class over an upcoming one, and shows a neutral "no more classes today" state instead of continuing to present a finished class as "next" (§G, flow #12).
§Y confirms no genuine open Stage 1A decisions remain after these revisions. §Z carries the final recommendation.
 
---
 
## A. UX Principles Specific to Academic OS
 
1. **One system, not five apps.** Every screen should visibly connect to the user's current academic context (active semester, and where relevant, the course/unit they came from). A Task opened from Home shows its Course/Unit chip; a Course shows its next class and open task count without navigating away.
2. **Progressive disclosure over dashboards.** Surfaces default to the minimum useful view (Simple Mode grade list, collapsed practice section, today's schedule only) and expand on demand. Nothing is shown "in case it's useful."
3. **Never fabricate certainty.** This is a hard product rule (grades) that becomes a UX rule everywhere: unknown ≠ zero. Empty analytics, unallocated grade points, and un-attempted schedule occurrences are always labeled as unknown/pending, never rendered as 0 or omitted silently.
4. **Fast capture, slow reflection.** Adding a task, marking attendance, or dropping a quick grade should be near-zero-friction (one tap from context). Analytics and semester-end review are deliberately a destination you visit, not something pushed at you constantly.
5. **Context-appropriate density.** Mobile favors single-focus screens and agendas; desktop favors multi-pane, denser, keyboard-navigable layouts. Desktop is not "mobile scaled up," and mobile is not "desktop with things removed."
6. **Historical data is inviolable in the UI, not just the DB.** If the data model says an attendance occurrence or task-completion event is immutable history, the UX must never present an interaction that appears to "go back and change what happened" — corrections create new events/states, they don't rewrite the past silently.
7. **No feature stands alone.** Tags, Units, Tasks, Schedule, Grades, and Practice all cross-reference the Course they belong to and, where applicable, each other — but cross-referencing is done via lightweight chips/links, never by duplicating full sub-UIs inside each other.
---
 
## B. Top-Level Information Architecture
 
Candidate domains: Home, Courses, Tasks, Schedule, Grades, Analytics, Settings/Tags.
 
**Decision: four domains earn primary navigation status — Home, Tasks, Schedule, Courses. Grades, Practice, Analytics, and Tags/Settings are demoted to secondary/contextual placement.**
 
| Domain | Top-level? | Why |
|---|---|---|
| **Home** | Yes | Orientation surface; always the "what now" answer. |
| **Tasks** | Yes | PRODUCT_SPEC §6 explicitly requires tasks to surface centrally, independent of any course. High frequency, used daily. |
| **Schedule** | Yes | Time-anchored, daily-use surface (today's classes, attendance). Distinct interaction rhythm from Tasks (clock-driven vs list-driven) — merging it into Home or Tasks would force two different mental models onto one screen. |
| **Courses** | Yes | The core hierarchy container (Course→Unit→Content Block). Everything else (Grades, Practice, Units, course-scoped Tasks/Schedule) nests under it. |
| **Grades** | No (secondary) | Meaningfully course-scoped in the data model (GradeCategory/GradeEntry per course); a cross-course rollup is useful but not frequent enough to earn a permanent mobile nav slot. Lives inside Course Detail, plus a lightweight cross-course "Performance" view accessible from Home/More. |
| **Practice** | No (secondary) | Same reasoning as Grades, plus it must visually avoid sitting beside Grades in a way that blurs the mandatory distinction (§12). Lives inside Unit Detail and a Course-level Practice view. |
| **Analytics** | No (secondary) | Not implemented until Stage 6, and even once built, it is a "visit deliberately" surface (Principle 4), not a daily habit screen. Lives in the Performance hub and at Semester End. |
| **Tags / Settings** | No (secondary) | Low-frequency configuration. Lives in a single Settings/More area. |
 
This keeps the primary nav budget disciplined (mobile convention: 4–5 destinations) while giving every domain a real, discoverable home — just not all at the same navigational tier.
 
---
 
## C. Mobile Navigation Architecture
 
**Persistent bottom navigation, 5 destinations:** `Home · Tasks · Schedule · Courses · More`
 
- **Home / Tasks / Schedule / Courses** — the daily-use loop.
- **More** — entry point to: Performance (Grades rollup, Practice rollup, Analytics), Tags, Settings (theme, notifications, semester info), Data (export, media export, import, Start New Semester).
- **Top app bar** on every screen: screen title (or contextual title — e.g. Course name on Course Detail), back affordance where applicable, and a single contextual action (e.g. "Add Course" on Courses list) — never more than one primary action in the app bar.
- **Sheets, not new pages,** for: adding a Task, marking attendance, quick-adding a Content Block, editing a schedule occurrence's status, tag create/edit, confirming completion toggles that need a moment (none currently — completion is instant). Sheets are used when the action is a *focused, single-purpose* interruption of the current screen and the user should land back exactly where they were.
- **Full pages** for: anything with its own sub-navigation or that the user might want to linger/scroll in — Course Detail, Unit Detail, Semester Setup, Grades tab, Analytics.
- **Destructive-action screens** (Start New Semester) are full pages, not sheets — the friction of a full navigation is intentional, matching SECURITY.md §9's "hard to fumble" requirement.
- No floating action button that means the same thing everywhere (see §Q for why a *context-sensitive* add affordance is used instead of a global FAB).
## D. Desktop Navigation Architecture
 
**Persistent left sidebar**, wider budget than mobile since desktop doesn't share thumb-reach constraints:
 
`Home · Tasks · Schedule · Courses · Performance · Settings`
 
- Sidebar promotes **Performance** (Grades + Practice + Analytics, tabbed within) to a first-class sidebar destination on desktop — the extra screen real estate removes the "too many top-level things" problem that justified demoting it on mobile.
- **Two-pane / split-view layouts** where mobile is single-focus: Courses list + Course Detail side-by-side (master-detail, like Mail apps); Schedule week grid with a persistent "today" side panel; Course Detail's Units list with a Unit Detail pane opening alongside rather than replacing it.
- **Command Palette (Cmd/Ctrl+K)** available globally on desktop for navigation and quick-add (see §Q) — desktop users are typically already on a keyboard, so this is a legitimate accelerator that would be an awkward, low-value addition on mobile.
- Desktop schedule view shows the full Sat–Fri week grid at once (time-of-day rows × 6 day columns); mobile uses a compact Week Overview with drill-in to a single Day Detail (see §K) — the two platforms intentionally use different representations of the same underlying week, not a scaled copy of one or the other.
- Keyboard focus order follows visual/logical hierarchy on every desktop screen; no keyboard traps in modals (see §U).
---
 
## E. Screen / View Inventory
 
1. Semester Setup (first-run and re-entry after "Start New Semester")
2. Home
3. Tasks (global) — Overdue / Today / Upcoming
4. Task Detail (sheet) — edit due date, title, delete
5. Schedule — weekly view (mobile: Compact Week Overview, with drill-in to Day Detail for a selected day; desktop: full Saturday–Friday grid, both views of one screen, not separate destinations)
6. Schedule Template Create/Edit (sheet/page)
7. Attendance Control (inline component — Upcoming / In Progress / Attendance-not-recorded states, appears on Home, Schedule Day Detail, desktop grid, and Course Detail's Schedule tab)
8. Courses (list/grid)
9. Course Create/Edit (sheet on mobile, dialog on desktop)
10. Course Detail (header + Units default view + segmented sections: Units / Tasks / Schedule / Grades / Practice)
11. Unit Create/Edit (sheet)
12. Unit Detail (Content Blocks / Tasks / Practice sections)
13. Content Block Add (type picker → composer, sheet/dialog)
14. Content Block Viewer/Editor (text rich-view, file/image/video viewer)
15. Grades — Course tab (Simple Mode view / Structured Mode view / mode-transition entry)
16. Grade Entry Create/Edit (sheet)
17. Grade Category/Structure Editor (page — nested category builder)
18. Practice — Unit section + Course-level Practice tab
19. Practice Entry Create/Edit (sheet)
20. Performance Hub (desktop sidebar item / mobile "More" entry) — Grades rollup, Practice rollup, Analytics
21. Analytics Dashboard (course/unit/semester trend views — Stage 6 implementation, IA slot only)
22. Weekly Check-in (lightweight sheet, optional, dismissible)
23. Semester End flow (review → export)
24. Export (Semester archive / Media export — separate actions)
25. Import (archive picker → validation result → confirm-replace)
26. Start New Semester (destructive, full page, typed confirmation)
27. Tags — list, create/edit (sheet), color picker
28. Settings — Theme, Notifications, Semester Info, About/PWA info
29. Empty/first-use variants of: Courses, Course Detail(Units), Unit Detail, Tasks, Schedule, Grades, Practice, Analytics
30. Offline indicator (global, non-blocking banner/badge — not a screen)
---
 
## F. Screen Hierarchy / Sitemap
 
```
Semester Setup (gate, if no active semester)
│
├── Home
│     ├── Today's Schedule (peek) ──────────────► Schedule
│     ├── Task Summary (Overdue + Today) ───────► Tasks
│     ├── Quick course access (recent/pinned) ──► Course Detail
│     └── Weekly Check-in prompt (dismissible) ─► Weekly Check-in (sheet)
│
├── Tasks (global: Overdue / Today / Upcoming by academic week)
│     └── Task Detail (sheet)
│
├── Schedule (weekly Sat–Fri)
│     │     mobile: Compact Week Overview ──(tap a day)──► Day Detail
│     │     desktop: full week grid (both views live on this one screen)
│     ├── Schedule Template Create/Edit
│     └── Attendance Control (inline: Upcoming / In Progress / Attendance not recorded)
│
├── Courses (list)
│     ├── Course Create/Edit
│     └── Course Detail  ── segmented: Units* / Tasks / Schedule / Grades / Practice
│           ├── Unit Detail
│           │     ├── Content Block Add → Viewer/Editor
│           │     ├── Unit-scoped Tasks (compact) ──► Task Detail
│           │     └── Practice entries (compact) ──► Practice Entry
│           ├── Course-scoped Tasks (compact) ──► Task Detail
│           ├── Course Schedule (compact) ──► Schedule (filtered)
│           ├── Grades tab → Grade Entry / Category Structure Editor
│           └── Practice tab → Practice Entry
│
└── More (mobile) / sidebar (desktop)
      ├── Performance Hub → Grades rollup / Practice rollup / Analytics
      ├── Tags (list, create/edit)
      ├── Settings (theme, notifications, semester info)
      └── Data
            ├── Semester End → review → Export
            ├── Import
            └── Start New Semester (destructive)
 
* Units is the default/first section shown in Course Detail.
```
 
---
 
## G. Home Information Hierarchy
 
**Home answers one question in under five seconds: "what do I need to do, and where am I today?"**
 
**Primary (always visible, above the fold):**
- **Current-or-next class card**, using one shared occurrence model with Schedule (§K):
  - If a class is **In Progress** right now, show that one — with the attendance control already available (Attended can be marked immediately, no need to wait for it to end).
  - Otherwise, show the **next** class still to come today (course, type, time, location) — no attendance control yet, since it hasn't started.
  - If today has no more classes left (all finished, or none were ever scheduled for today), show a calm, neutral **"No more classes today"** state — Home must never keep displaying an already-finished class as if it were still "next" (this was a coherence gap in the original proposal; see §0 Revision C).
  - Home intentionally does **not** surface a backlog of unmarked attendance from earlier in the day — that's what Schedule's Day Detail is for (§K); Home stays limited to "what's happening right now or next."
- Overdue task count + the tasks themselves if the list is short (else "3 overdue →").
- Today's remaining tasks (due today, grouped by the Sat–Fri week utility's "Today" bucket).
**Secondary (below the fold, scrollable, not competing for the first glance):**
- Rest of today's schedule (classes later today).
- Quick access to a small number of recently-opened courses (not the full course grid — that's what the Courses tab is for).
- Weekly check-in prompt, once per week, dismissible, never a modal interruption.
**Explicitly NOT on Home:**
- Grade charts, practice charts, attendance percentage widgets, semester trend graphs — these belong in the Performance Hub, and putting them on Home would violate Principle 2/4 (dashboard overload, pushed reflection).
- Full course grid.
- Settings/Tags shortcuts.
- Analytics of any kind.
**Naming: "Home," not "Today" or "Dashboard."** "Today" undersells that Home also shows Overdue (which by definition isn't today) and a course-access convenience the user may use anytime. "Dashboard" over-promises analytics-style density that Principle 2 deliberately avoids. "Home" is the honest, low-commitment label for an orientation screen.
 
---
 
## H. Course Detail Architecture
 
**Rejected approach:** a 5–6 item tab bar (Overview / Units / Tasks / Schedule / Grades / Practice / Analytics) across the top. Rejected because: (1) it treats all sub-domains as equally frequent when Units is used far more than Grades/Practice/Schedule in normal day-to-day use, (2) six-plus tabs on a mobile-width screen either truncate labels or force horizontal scrolling, both bad, (3) it invites decision paralysis on a screen a student may open several times a day just to check one thing.
 
**Chosen approach:** Header + default content (Units) + a compact segmented control for secondary sections.
 
- **Header:** Course name, code (if present), instructor (if present), tag chips, quick edit affordance.
- **Default body:** Units list (ordered, with type badges) — this is the highest-frequency action (opening a course to get to its content).
- **Compact segmented control** beneath the header (mobile: horizontal scroll-if-needed chip row; desktop: a slim left-hand sub-sidebar within the Course Detail pane) offering: **Units (default) · Tasks · Schedule · Grades · Practice**. Selecting one swaps the body content in place — no full-page navigation, so the course context (header) never disappears.
- Course-level Tasks/Schedule/Grades/Practice tabs show *only what belongs to this course*, reusing the same compact row/list components used in their respective global or Unit-level views (component reuse, not parallel UI).
- No Analytics tab inside Course Detail in v1 — course-level trend data lives in the Performance Hub, filterable by course, keeping Course Detail focused on content and day-to-day management rather than becoming a second analytics surface.
---
 
## I. Unit Detail Architecture (including Content Blocks)
 
**Header:** Unit title, type badge (from default suggestions or custom — never implies a matching Schedule Event Type, per PRODUCT_SPEC §4/§7), order/position indicator, quick edit.
 
**Body, in priority order:**
1. **Content Blocks** (primary, default-open) — ordered list, each block rendered by type: text blocks show a rendered (sanitized) preview snippet, not raw Markdown source; file/image/video blocks show title + type icon + size, with tap-to-open.
2. **Tasks** (collapsible section, collapsed if empty) — unit-scoped tasks only, compact rows (title, due date, checkbox), "Add Task" inline.
3. **Practice** (collapsible section, collapsed if empty) — visually distinct styling (different accent/icon than anything grade-related) per the mandatory Grades/Practice separation.
**Content Block add interaction:**
- Mobile: tapping "Add Content" opens a **bottom sheet** with four type choices (Text / File / Image / Video). Choosing a type opens the appropriate composer (text: lightweight formatting toolbar over a text area, never raw HTML/Markdown-syntax-required entry; file/image/video: native file/photo picker → title field, independent from the original filename per PRODUCT_SPEC §5 → upload progress → inline validation feedback if MIME/size rejected, per SECURITY.md §2).
- Desktop: same flow as a centered dialog rather than a sheet.
- **Why a sheet/dialog type-picker over a command menu or inline composer:** adding a content block is infrequent-but-deliberate (unlike toggling a task), and the four types have meaningfully different composers — a single inline "compose anything" box would have to guess intent. A type-first picker matches the user's actual mental model ("I want to add my lecture slides" → File, not "I want to type something ambiguous").
- **Editing:** text blocks reopen the same composer pre-filled; file/image/video blocks allow retitling and deletion but not "editing" the underlying file (replacing = delete + re-add, kept simple rather than inventing a versioning concept the data model doesn't have).
- **Reordering:** drag-handle in an explicit "Reorder" mode (long-press or an edit-mode toggle) rather than always-on drag, to avoid accidental reordering during normal scrolling — this matters more on touch than desktop.
- **Rendering safety is a UX-visible constraint, not just backend:** the text composer never exposes an "insert raw HTML" affordance; only the finite formatting toolbar (bold/italic/heading/list/link/inline code) actions are available, which is what keeps the parse-then-sanitize guarantee in SECURITY.md §1 honest at the interaction level, not just the rendering level.
---
 
## J. Global Tasks Architecture
 
**Global Tasks screen:** three sections — **Overdue**, **Today**, **Upcoming** (grouped by day, Saturday-anchored academic week, current week's remaining days expanded, subsequent weeks collapsed by default with a week-label header, e.g. "Next week (Aug 2–8)"). Tasks without a due date live in a small "No due date" section beneath Upcoming, not scattered.
 
**Completion interaction:** tap a checkbox → instant optimistic toggle → row moves/fades appropriately (an Overdue task marked complete visually confirms and settles; nothing yells "task deleted"). A brief undo affordance (snackbar, ~4s) reverses the toggle.
 
**Important semantic note (data-model-driven):** an "undo" is not a UI-only revert — because TaskCompletionEvent is an append-only log where "every toggle, in either direction, appends a new event," tapping undo genuinely writes a second, opposite transition event. This is correct and intended (the data model is explicitly built to survive rapid back-and-forth toggling) — the UX should not try to "cancel" the first event before commit, since optimistic instant-feedback is more valuable here than a debounce window, and the event log is designed to absorb exactly this pattern.
 
**Course/Unit-level task visibility:** both reuse the identical compact task-row component (title, due date, checkbox) filtered to that scope — no separate mini-Tasks-app rebuilt per context. Each compact list has a "View all in Tasks →" link when scoped tasks exceed a handful, rather than growing Course/Unit Detail into a second full Tasks UI.
 
**Home's task summary** is the same component again, filtered to Overdue + Today only, capped at a small count with a "+N more" link into the full Tasks screen if exceeded.
 
---
 
## K. Schedule + Attendance Architecture
 
### Weekly Schedule
 
**Mobile — Compact Week Overview → Day Detail (hybrid, per product-owner Revision A):**
- The Schedule screen's **default/landing view is the Week Overview** — a compact, readable representation of the entire Saturday–Friday week (e.g. seven slim day columns/rows each showing a small stack of class markers — type/course indicated by short label or color+label chip, not full card detail). The goal is that the user can see the *shape* of their week — which days are light, which are packed, where today sits — without tapping into anything. This is intentionally **not** a shrunk version of the desktop time-grid; a compact mobile-appropriate summary (e.g. a condensed day-by-day list of short event chips) is enough to convey structure, since precise time-of-day layout is what the Day Detail is for.
- **Today is visually emphasized** within the Week Overview (e.g. highlighted column/row treatment), so orientation is instant even before drilling in.
- **Tapping/selecting a day** in the Week Overview navigates into that day's **Day Detail** — a chronological agenda for that single day showing, per class: course, event type, start/end time, location, and the attendance control (§Attendance below) where the occurrence's timing makes it valid.
- Moving between days from within Day Detail (e.g. arrows or swipe) is a convenience, not the primary navigation path — the Week Overview remains the anchor a user returns to for "what does my week look like."
**Desktop — full week timetable/grid (unchanged from the original proposal):** Saturday→Friday columns, time-of-day rows, today's column highlighted, all seven days visible at once — the extra width makes the dense grid the right default here, with no separate "overview vs. detail" split needed.
 
**Creating a recurring template:** a form (Course, Event Type from suggested-or-custom list, Day, Start/End time, Location, Instructor optional, effective date range optional) — a full page on both platforms since it has several fields and benefits from validation feedback (end after start, etc.), not a quick sheet.
 
**Editing a template:** same form, pre-filled; changes apply going forward only — the UI copy explicitly says "this won't change past attendance records," reinforcing the snapshot/template distinction from DATA_MODEL.md so users don't expect edits to rewrite history.
 
### Attendance (revised per product-owner Revision B)
 
**Presentation states, computed from the occurrence's stored status plus the current time — not a new persisted value.** DATA_MODEL.md's `ScheduleOccurrence.status` remains exactly `"attended" | "missed" | "cancelled" | "unmarked"` — Stage 0 is unchanged. What's new is purely a **presentation-layer** state the UI derives for an `unmarked` occurrence by comparing now to its start/end time:
 
| Presentation state | When | What the user sees/can do |
|---|---|---|
| **Upcoming** | now < start time | No attendance control shown yet — marking attendance before a class has happened isn't offered, since it can't yet be determined. |
| **In Progress** | start time ≤ now < end time | Full three-option control (**Attended / Missed / Cancelled**) is available immediately — a student attending class right now can mark Attended without waiting for it to end. |
| **Attendance not recorded** | now ≥ end time, status still `unmarked` | A neutral, non-judgmental label — explicitly **not** "Missed." The same three-option control remains available. The app never auto-infers Missed purely because time has elapsed; absence of action stays "unknown," matching the defensive-read philosophy in SECURITY.md §10 and never silently manufacturing a false attendance record. |
| *(any occurrence with a recorded status)* | any time | Shown with its recorded status (Attended/Missed/Cancelled) as a stable label; tapping it reopens the same control to **correct** it — corrections are always available, no time-boxing or special confirmation for a same-semester correction, since this is a low-stakes, frequent, personal action (Principle 4). |
 
- **Fastest path:** the control above appears inline wherever an occurrence is shown — Home's current-class card (In Progress case), Schedule's Day Detail, the desktop grid, and Course Detail's Schedule tab. One underlying occurrence-state, many entry points — never parallel "attendance" concepts that could disagree with each other.
- **Historical stability:** the occurrence's denormalized snapshot (course/type/time/location as they were) is what's always displayed, so a later template edit never retroactively changes what a past occurrence shows, and marking/correcting attendance never touches the template.
- **No dependency on notifications:** the app never assumes a reminder fired; every state above is derived purely from "what's on the schedule relative to the current time," fully consistent with ARCHITECTURE.md's documented notification limitations — attendance functionality works identically whether or not notification permission was ever granted.
---
 
## L. Grades Architecture
 
**Location:** Course Detail → Grades tab (primary), plus a read-only cross-course rollup in the Performance Hub.
 
**Mode is emergent, not a permanent upfront choice** *(approved by the product owner — see §0)*: a course starts in **Simple Mode** the moment its first ungrouped GradeEntry is added (flat list: "Quiz 1 — 3/5," "Quiz 2 — 5/5," running "8/10 recorded" total). The course transitions into **Structured Mode** the moment the user defines a GradeCategory tree via an explicit "Add course structure" action — at that point the UI shifts to the nested category view (Coursework 60 → Quizzes 10/Assignments 10/Midterm 20/Project 20, Final 40) with existing ungrouped entries remaining valid and reassignable, never force-migrated.
 
**Simple Mode view:** flat entry list, sum of earned/possible clearly labeled "of entries recorded so far" — never phrased in a way that implies it's the whole course.
 
**Structured Mode view:** category tree with per-category and overall rollups, explicit distinction between: earned so far, known-possible-so-far, remaining-unrecorded-but-allocated points, and (if a target grade is set) required score to reach it. Any category with entries below its declared max shows the gap explicitly ("6/10 recorded, 4 pts remaining in this category") rather than treating the missing 4 as zero.
 
**Never fabricated:** if the category structure doesn't fully sum to the course's declared total (e.g. categories only account for 90 of 100 points because the user hasn't finished configuring), the UI shows "10 pts not yet allocated" rather than silently treating the course as 100%-structured.
 
---
 
## M. Practice Performance Architecture
 
**Never inside the Grades tab.** Lives in: (1) a compact section within each Unit Detail, (2) a Course-level "Practice" tab in Course Detail's segmented control, (3) a rollup in the Performance Hub.
 
**Visual/structural separation is a hard requirement**, not a styling nicety — distinct icon/accent used consistently everywhere Practice appears, distinct empty-state copy ("Practice scores help you gauge your own understanding — they never affect your official grade"), and Practice entries are never summed into, displayed alongside as if comparable to, or allowed to share a category with GradeEntries.
 
**Entry creation:** same lightweight sheet pattern as Grade entries (label, earned, max) but visually themed distinctly and only reachable from Practice-labeled affordances.
 
---
 
## N. Analytics Architecture
 
**Not built until Stage 6 — this section defines the IA slot only.**
 
- **Global (Performance Hub):** semester-wide trends — task completion rate, attendance rate, practice trend, grade trend across courses, "strongest/needs attention" units.
- **Course-scoped:** available as a filter within the Performance Hub (not a separate Course Detail tab — see §H) — attendance %, task completion, grade trajectory, practice trend for that one course.
- **Unit-scoped:** minimal — mainly practice-score trend for that unit, if any, surfaced inline in Unit Detail's Practice section rather than a dedicated analytics view (a whole chart per unit would be over-building for a data slice this small).
- **Semester End only:** the fuller semester retrospective (§O) — this is the one place a denser, multi-chart view is appropriate, because the user has explicitly arrived to reflect, not to glance.
- **Never on Home.** At most, once enough data exists, Home may show one plain-text weekly stat ("5 of 7 tasks completed this week") — text, not a chart, and never before there's enough data to be meaningful (empty/low-data state suppresses it entirely rather than showing a flat "0%").
- **Causation discipline is a copy requirement everywhere analytics text appears** (per PRODUCT_SPEC §13/Invariant #8) — correlational phrasing only, enforced as a content-writing rule for whoever implements Stage 6 copy.
---
 
## O. Semester Lifecycle Architecture
 
```
No semester ──► Semester Setup ──► Active Semester ──► Semester End ──► Export
                                         │                                  │
                                         └──────── (independent) ──────────┘
                                                          │
                                                          ▼
                                              Start New Semester (separate,
                                              destructive, typed confirmation)
                                                          │
                                                          ▼
                                                   Semester Setup (again)
```
 
- **Semester Setup:** one screen, minimal required fields (academic year, semester label), optional fields (start/end date) visually secondary/collapsed. No mention of Saturday–Friday week mechanics needed here — it's an invisible system rule, not something the user configures.
- **Semester End** is a *reviewing* flow, not a destructive one: it surfaces the final analytics snapshot for the semester and prompts export — but is reachable at any time, not gated behind an actual calendar end date (the user decides when their semester is "done").
- **Export** (Data area) and **Start New Semester** (Data area, visually separated into a distinct "danger zone" subsection with different color/iconography language) are two independent entry points with no shared button, no chaining, and no implicit sequencing — directly enforcing PRODUCT_SPEC §16/§19 and Invariant #4.
- **Start New Semester** confirmation: typed phrase (e.g. "DELETE" or the semester name), full-page (not a sheet — the extra navigational weight is intentional friction), explicit list of what's deleted (courses, units, content, tasks, schedule, grades, practice, check-ins) vs. what survives (theme, notification settings, global Tags) shown before the type-to-confirm field.
- **Historical semesters are export-only** in v1 — no in-app browser for past semesters; this is called out plainly in the Data area's copy so users understand export is their only backup mechanism, consistent with the storage-eviction risk noted in DATA_MODEL.md.
---
 
## P. Tags + Settings Architecture
 
**Tags** (under Settings/More):
- List view: name + color swatch, tap to edit.
- Create/edit: name field + color picker (small curated palette, not a full color wheel — keeps a visually coherent tag system across the app rather than clashing arbitrary hues).
- Deletion: warns that any course associations pointing to this tag will simply disappear (not cascade-delete courses) — matching the "stale reference silently filtered" behavior in DATA_MODEL.md.
- **Assignment:** happens inside Course Create/Edit via a multi-select chip picker, plus an inline "+ New Tag" affordance so the user isn't forced to leave the course form to create a tag they realize they need mid-flow.
- **Filtering:** an optional, collapsed-by-default tag-filter row atop the Courses list — expands on tap, doesn't consume permanent vertical space when unused.
**Settings:**
- Semester info (read/edit academic year, label, dates)
- Notification preferences (reminder lead time, enable/disable — with the in-app-only limitation stated plainly)
- Appearance (theme: system/light/dark)
- Data (Export, Media Export, Import, Start New Semester)
- About/PWA info (version, install prompt access on platforms that support it, storage usage via `navigator.storage.estimate()`)
Settings deliberately does **not** hold: Tags management is one tap away but tag *usage* (assignment/filtering) lives where tags are actually used (Course screens), not exclusively in Settings — Settings is the definition/config home, not the only place tags appear.
 
---
 
## Q. Add/Create Interaction Strategy
 
**No single global FAB with one fixed meaning** — a FAB meaning "add task" on one screen and "add course" on another is a consistency violation (same icon, different outcome depending on where you happen to be, with no visible label).
 
**Chosen pattern — context-sensitive primary add action:**
- **Mobile:** each screen with a natural "add" concept shows a single, clearly-scoped add affordance appropriate to that screen (top app bar "+" or an in-content "Add Unit"/"Add Task"/"Add Content" row) — visually consistent placement (top-right of the app bar) but the *result* is always unambiguous because it's the only add-shaped thing on that screen.
- **Desktop:** the same contextual actions, plus the **Command Palette** (Cmd/Ctrl+K) as an accelerator that offers "Add Course," "Add Task," "New Schedule Event," etc. regardless of current screen — appropriate on desktop because the palette is explicit (typed intent), not an ambiguous icon.
- Screens with no natural "add" concept (Grades rollup view, Analytics, Home) simply have no add affordance.
---
 
## R. Search Strategy
 
**No global search in v1.** Rationale: the data model is deliberately scoped to **one active semester** at a time (DATA_MODEL.md, PRODUCT_SPEC §15) — a single semester's course/unit/task count is small enough that browsing via Courses → Units, or the Tasks screen's grouping, is faster and clearer than typing a query, and a search feature would mostly return near-empty result sets early in a semester. Building search now would be solving a problem the current scope doesn't have.
 
**Revisit condition (explicitly logged, not silently dropped):** if a future in-app multi-semester history browser is ever approved (currently explicitly out of scope per Invariant/§15), or if Content Block volume within a single semester grows large (e.g. many text-note bodies), global search becomes clearly justified and should be reconsidered at that time — not before.
 
---
 
## S. First-Run / Onboarding Flow
 
```
Install/first open
   → Semester Setup (academic year + semester label; dates optional/collapsed)
   → Home (empty state: "Add your first course" CTA, no other content yet)
   → Course Create (name required, everything else optional/collapsed)
   → Course Detail, Units empty state: "Add your first unit"
   → (user proceeds at their own pace from here — no forced tour of
      Tasks/Schedule/Grades/Practice)
```
 
- No multi-step mandatory tutorial overlay walking through every feature — each domain teaches itself via its own empty-state CTA the first time the user visits it (see §T), which respects Principle 2 and avoids a wall of "here's feature #7 of 12" screens before the user has even created a course.
- Settings/theme is reachable even before a semester exists (it lives in the separate `academic-os-preferences` store, per ARCHITECTURE.md) — **approved by the product owner** (§0): basic preferences remain reachable pre-semester, while everything semester-dependent (Courses, Tasks, Schedule, Grades, Practice) stays gated behind Semester Setup.
---
 
## T. Empty / Edge-State Inventory
 
| State | Required UX behavior |
|---|---|
| First install, no semester | Home (and most nav) gated behind Semester Setup; Settings/theme remains reachable. |
| Semester with no courses | Home shows a single "Add your first course" CTA; Courses list shows the same. |
| Empty Course (no units) | CTA explaining Units organize a course's content; no fake sample data. |
| Empty Unit (no content blocks) | CTA to add first content block; Tasks/Practice sections stay collapsed if also empty. |
| No tasks anywhere | Positive framing ("Nothing due — you're caught up") distinct from a course/unit that simply has zero tasks ever created (neutral, not celebratory, framing there). |
| No schedule at all | CTA to add a recurring class; Home's current/next-class slot and the mobile Week Overview both show a neutral "No classes scheduled" rather than an error or an empty grid with no explanation. |
| Today's classes all finished (schedule exists, day is over) | Home shows a calm "No more classes today" — never continues showing the last-finished class as "next" (Revision C). |
| Occurrence unmarked after it ends | Shown as neutral "Attendance not recorded" — never rendered or implied as "Missed"; the three-option control (Attended/Missed/Cancelled) remains available to resolve it whenever the user gets to it. |
| No grades yet (a course) | Explains Simple vs. Structured briefly inline, doesn't force a mode choice — mode is emergent (see §L). |
| No analytics yet | "Insights appear once there's enough data" — threshold-based, never a 0%/empty chart. |
| Offline | Non-blocking banner/badge; reassures full functionality remains available (local-first); no feature is disabled. |
| File unavailable/corrupted | Defensive per-item message ("This file couldn't be loaded") — never crashes the Unit/Content Block list around it. |
| Notification permission denied | App remains fully usable; a single, non-repeating hint about the limitation; no nagging re-prompts. |
| Invalid/corrupt imported archive | Specific rejection reason shown; current semester is left completely untouched; no partial import. |
| Destructive confirmation (Start New Semester) | Typed-phrase confirmation, explicit "what's deleted / what survives" list shown first. |
| Partially configured grade structure | Explicit "N pts not yet allocated" — never silently treated as complete or as zero. |
 
---
 
## U. Accessibility Requirements
 
- **Touch targets:** minimum 44×44pt for all tappable controls, including compact task-row checkboxes and attendance state buttons.
- **Focus management:** sheets/dialogs trap focus while open, restore focus to the triggering element on close, and are dismissible via Esc (desktop) or back-gesture/close button (mobile) — never only by tapping outside with no other affordance.
- **Semantic hierarchy:** every screen has one logical heading (screen/course/unit title) in the accessibility tree, with sub-sections as proper headings, independent of their visual size.
- **No color-only status:** Attended/Missed/Cancelled, the derived Upcoming/In Progress/Attendance-not-recorded presentation states, Overdue/Today/Upcoming task grouping, and any grade-boundary coloring must all pair color with an icon and/or text label — "Attendance not recorded" in particular must never be distinguishable from "Missed" by color alone, since the two must never be confused.
- **Swipe actions need a non-gesture equivalent:** anywhere a swipe-to-complete or swipe-to-mark-attendance pattern is used, an equivalent inline button/menu must also exist — swipe gestures are not reliably accessible to screen-reader or switch-control users.
- **Form errors:** programmatically associated with their field (not color/border alone), announced on submission attempt, phrased as what to fix, not just "invalid."
- **Reduced motion:** any transition (sheet presentation, list reordering animation, chart animation in future Analytics) respects `prefers-reduced-motion`, degrading to an instant/simple state change.
- **Icon-only controls** (FAB-equivalents, swipe-action icons, chip removal "x") always carry an accessible label even when visually unlabeled.
- **Keyboard (desktop):** full tab-order navigability through every primary flow (Course create, Task create, Attendance marking, Grade entry) without requiring the mouse; Command Palette is itself a fully keyboard-operable pattern.
---
 
## V. Major User Flows
 
**1. First launch → semester setup → first course**
Open app → Semester Setup (year + label) → Home (empty) → tap "Add your first course" → Course Create (name required) → Course Detail (empty Units state).
 
**2. Create Course**
Courses list → "+" → Course Create sheet/dialog (name; optional code, instructor, description, tags via chip picker with inline "+ New Tag") → Save → lands on new Course Detail.
 
**3. Assign/create Tag**
From within Course Create/Edit's tag picker → "+ New Tag" → name + color (sheet) → Save → tag immediately available/selected on the course being edited, and now reusable on every future course.
 
**4. Open Course → create Unit**
Course Detail (Units default) → "+ Add Unit" → title + type (suggested list or custom) → Save → appears in ordered Units list.
 
**5. Open Unit → add formatted note**
Unit Detail → "Add Content" → type picker → Text → composer (toolbar: bold/italic/heading/list/link/code) → Save → renders as a sanitized preview in the Unit's content list.
 
**6. Open Unit → add file/image/video**
Unit Detail → "Add Content" → type picker → File/Image/Video → native picker → title field (independent of filename) → validation (MIME/size) → Save → appears with type icon, tap to view via native viewer/`<video>`.
 
**7. Create Course-level Task**
Course Detail → Tasks tab → "+ Add Task" → title + optional due date (no unit selected) → Save → appears in course's Tasks tab and in Global Tasks.
 
**8. Create Unit-level Task**
Unit Detail → Tasks section → "+ Add Task" → title + optional due date → Save → appears in Unit's Tasks section, Course's Tasks tab, and Global Tasks.
 
**9. Complete → undo → re-complete Task**
Tap checkbox (Incomplete→Complete, event written) → snackbar "Undo" appears → tap Undo (Complete→Incomplete, second event written) → tap checkbox again (Incomplete→Complete, third event written) → all three transitions permanently retained in TaskCompletionEvent; Task.completed/completedAt reflect only the current state.
 
**10. View weekly tasks Saturday–Friday**
Global Tasks → Upcoming section, grouped by the shared academic-week utility starting Saturday; current week expanded, later weeks collapsed with a date-range header.
 
**11. Create recurring schedule template**
Schedule → "+ Add Class" → form (Course, Event Type, Day, Start/End time, Location, Instructor optional) → Save → appears in the weekly grid/agenda going forward; no past occurrences retroactively affected.
 
**12. View today's classes**
Home's current/next-class card (shows the In Progress class if one is running, otherwise the next class still to come today, otherwise a neutral "No more classes today") — and/or Schedule: mobile taps into the Week Overview then selects today (pre-emphasized) to reach Day Detail, desktop simply looks at today's highlighted grid column. Both surfaces reflect the same occurrence data.
 
**13. Mark attendance**
As soon as a class reaches its start time (In Progress) → the three-option control (Attended / Missed / Cancelled) becomes available on Home's current-class card, Schedule's Day Detail, the desktop grid, or Course Detail's Schedule tab → user can mark Attended immediately without waiting for the class to end → occurrence status saved with its denormalized snapshot. If left unmarked past the class's end time, the occurrence simply shows "Attendance not recorded" (never auto-Missed) with the same control still available whenever the user returns to it.
 
**14. Correct attendance**
Tap any occurrence that already has a recorded status (or one still showing "Attendance not recorded") anywhere it appears → the same three-option control reopens → select the corrected status → saved immediately, no extra confirmation required for a same-semester correction.
 
**15. Add Simple Mode grade**
Course Detail → Grades tab (course has no category structure yet → Simple Mode) → "+ Add Grade" → label, earned, max → Save → running "X/Y recorded" total updates.
 
**16. Configure/use Structured Mode**
Grades tab → "Add course structure" → Category Editor (define Coursework 60 → Quizzes 10/Assignments 10/Midterm 20/Project 20, Final 40) → Save → Grades tab now shows the nested category view; existing ungrouped entries remain visible/reassignable, not force-migrated.
 
**17. Add PracticeEntry**
Unit Detail → Practice section → "+ Add Practice Score" → label, earned, max → Save → appears in Unit's Practice section (distinct styling) and rolls up into Course Detail's Practice tab.
 
**18. Inspect course performance**
Performance Hub → filter by Course → view attendance %, task completion, grade trend, practice trend for that course specifically (no dedicated Course Detail Analytics tab in v1 — see §H).
 
**19. Semester End → analytics → export**
Settings/More → Data → "Semester End" → review analytics snapshot → "Export Semester Archive" (independent action; does not touch active data) → optionally also "Export Media."
 
**20. Start New Semester safely**
Settings/More → Data → "Start New Semester" (danger-zone styling) → full-page confirmation listing what's deleted vs. preserved → type confirmation phrase → confirm → semester workspace deleted/recreated, Tags/preferences untouched → returns to Semester Setup.
 
---
 
## W. Key UX Decisions and Rationale (summary)
 
- Bottom nav capped at 4 primary + "More," rather than trying to fit Grades/Analytics into primary nav — protects the daily-use loop (Home/Tasks/Schedule/Courses) from dilution.
- Course Detail uses a header + default-Units + compact segmented control, not a multi-tab bar — matches actual usage frequency (Units ≫ Grades/Practice/Schedule access).
- Content Block creation is type-first (picker before composer), not an ambiguous "add anything" box — matches the user's actual intent formation ("I have a file" vs. "I want to write a note").
- Grade mode (Simple/Structured) is emergent from whether a category structure exists, not a permanent upfront choice — avoids forcing a decision before the user has enough information to know which mode fits, and matches DATA_MODEL.md's explicit "a course may start in Simple Mode and later adopt structure without migration."
- Attendance marking is duplicated across four surfaces (Home, Schedule Day Detail, desktop grid, Course Detail) intentionally, backed by one underlying occurrence-state derived into Upcoming/In Progress/Attendance-not-recorded — optimizes for "mark it wherever you happen to be looking," not "there's exactly one correct place to do this," while never inferring Missed from elapsed time alone (product-owner Revision B).
- Mobile Schedule uses a Compact Week Overview → Day Detail hybrid rather than a day-only agenda (product-owner Revision A) — preserves the "see my whole week's shape" mental model that a strict one-day-at-a-time view would have hidden, without trying to force the dense desktop grid onto a narrow screen.
- Home shows the in-progress class first, then the next upcoming class today, then a neutral "no more classes today" state — never a stale finished class presented as "next" (product-owner Revision C).
- No global search, no Analytics on Home, no global FAB — each is a deliberate exclusion tied to actual scope/frequency, not an oversight.
## X. Rejected Alternatives and Why
 
- **Full tab bar on Course Detail (Overview/Units/Tasks/Schedule/Grades/Practice/Analytics):** rejected — clutter, label truncation on mobile widths, and treats rarely-used tabs as equally important to Units.
- **Global FAB with one fixed action:** rejected — same visual affordance meaning different things per screen is a consistency/predictability failure.
- **Grades and Analytics as top-level primary nav items:** rejected — both are meaningfully course-scoped or deliberately low-frequency (Principle 4), and would crowd out Tasks/Schedule which are genuinely daily-use.
- **Global search in v1:** rejected — single active-semester scope makes browsing sufficient; premature for the current data volume.
- **Mandatory feature-tour onboarding:** rejected — each domain's own empty-state CTA teaches it in context, exactly when it's needed, instead of front-loading a dozen screens of "here's what this button does" before the user has any real data.
- **Swipe-only interactions for completion/attendance:** rejected as the *only* mechanism — accessibility requires a non-gesture equivalent to exist alongside any swipe shortcut.
- **Day-only mobile Schedule (original Stage 1A proposal):** superseded by product-owner Revision A — a pure one-day agenda hides the shape of the whole academic week and would require up to seven taps just to see what the week looks like; the Compact Week Overview → Day Detail hybrid gives that orientation for free while still narrowing to a readable single-day agenda for the details.
- **Attendance control gated until class end time / auto-inferring Missed from elapsed time (original Stage 1A proposal):** superseded by product-owner Revision B — both made attendance slower than necessary (a student can't confirm they're in class until it's over) and risked manufacturing a false "Missed" record for a class the user simply hasn't gotten around to marking yet, which conflicts with the defensive-read/never-fabricate principles already established for grades.
## Y. Stage 0 Ambiguities / Open Items Discovered
 
All four items raised in the original Stage 1A proposal have been resolved by the product owner (§0) and are no longer open:
 
1. ~~Course code required vs. optional~~ — resolved: Stage 0 rule unchanged (name required, code optional). No Stage 0 document was altered.
2. ~~Grade mode entry mechanism~~ — resolved: the emergent Simple → Structured model (§L) is approved.
3. ~~Pre-semester Settings access~~ — resolved: approved as proposed.
4. ~~Performance Hub present on mobile (under More) vs. desktop sidebar~~ — resolved: approved as proposed (mobile: under More; desktop: promoted to the sidebar).
**One clarification added during this revision, not a new open item, purely to keep this document internally consistent with the approved DATA_MODEL.md:** the new Upcoming / In Progress / Attendance-not-recorded attendance states (§K, Revision B) are a **presentation-layer** derivation from the existing `ScheduleOccurrence.status` (`attended | missed | cancelled | unmarked`) combined with the current time — they do not introduce a new persisted status value, so no change to DATA_MODEL.md is implied or required.
 
**No genuine unresolved Stage 1A product decisions remain.**
 
## Z. Recommendation
 
Internal consistency with Stage 0: **consistent.** No Stage 0 document (PRODUCT_SPEC.md, ARCHITECTURE.md, DATA_MODEL.md, SECURITY.md, ROADMAP.md, DEVELOPMENT.md) was altered by this revision; every change made was a Stage 1A (UX/IA) decision operating within Stage 0's existing rules, and the one place a new state concept was introduced (attendance presentation states) was explicitly checked against DATA_MODEL.md and confirmed to require no schema change.
 
A full consistency pass was performed across UX principles, navigation architecture (mobile/desktop), the screen inventory, the sitemap, Home, Course Detail, Schedule, Attendance, Grades, the major user flows, and the open-items/recommendation sections — confirming specifically that:
- No section still restricts mobile Schedule to a day-only, one-day-at-a-time view (§C, §D, §E, §F, §K, flow #12 now describe the Compact Week Overview → Day Detail hybrid).
- No section still states or implies that attendance can only be marked after a class ends (§G, §K, §T, §U, flows #13–14 now describe the Upcoming/In Progress/Attendance-not-recorded model, with Attended markable as soon as a class starts).
- No section still shows Home continuing to present a finished class as "next" (§G, §W, flow #12 now describe the current → next → neutral-empty priority order).
No genuine unresolved Stage 1A product decisions remain (§Y).
 
**Recommendation: APPROVE STAGE 1A.** The document's status has been updated accordingly at the top of this file. Stage 1B (visual design system + Figma) may begin once you give explicit go-ahead — per the Roadmap, it does not start automatically from this approval alone.
