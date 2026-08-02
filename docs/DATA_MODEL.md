# Data Model — Academic OS

> **Source-of-truth scope:** entities, relationships, invariants, and the persistence model. Business rules that motivate this shape live in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md); tooling choices live in [ARCHITECTURE.md](./ARCHITECTURE.md).
>
> This is a **conceptual** data model for planning purposes — field names/types illustrate intent, not a final committed schema. The actual Dexie schema is authored in Stage 2.

## Storage Architecture

Two separate IndexedDB databases via Dexie, deliberately kept apart so a destructive semester reset can never touch preferences or the user's global tag taxonomy:

1. **`academic-os-preferences`** — app-level **persistent** data that must survive "New Semester": AppPreferences (theme, notification preferences, last-export reminders, onboarding flags) **and the global `Tag` table** (see §Tag below — resolved: Tags are a global, cross-semester taxonomy, not semester-scoped). Small, long-lived, never bulk-deleted by a semester reset.
2. **`academic-os-semester`** — the single active semester workspace: Semester, Course, Unit, ContentBlock, Blob, Task, TaskCompletionEvent, ScheduleTemplate, ScheduleOccurrence, GradeCategory, GradeEntry, GradeBoundary, PracticeEntry, WeeklyCheckIn. "Start New Semester" deletes/recreates this entire database; `academic-os-preferences` (including Tag definitions) is untouched.

The app operates on **one active semester at a time** (per product spec §15) — there is no in-app multi-semester browsing in v1. This is a **resolved v1 scope decision**, not an open question: history beyond the active semester is preserved *exclusively* by explicit Semester Export (§16); there is no in-app historical-semester browser, and Import (**implemented, Stage 5** — see §"Archive Schema" below and SECURITY.md §3) is the only path that brings a historical archive's data back into the single active workspace.

### Cross-database references are not enforceable at the database layer

Because Tag now lives in a *different* IndexedDB database than Course, a `Course.tagIds[]` entry is a **cross-database reference**. Dexie/IndexedDB cannot enforce foreign keys — or even query/join — across two separate databases. This is handled entirely at the application/repository layer:

- Resolving a course's tags for display means two separate queries (read `Course.tagIds`, then read matching rows from the `Tag` table in the preferences database) joined in application code — never a database-level join.
- If a `tagId` no longer resolves to an existing `Tag` row (e.g. the global tag was deleted from Settings), the association is treated as **stale and silently filtered out at read time**, not as an error — consistent with the defensive-read principle in SECURITY.md §10. No destructive cascade is triggered across databases just because a tag was deleted.

### Why IndexedDB (not `localStorage`)

`localStorage` is synchronous, string-only, capped around ~5–10MB, and blocks the main thread — unsuitable for an app that will store images/PDFs/videos and needs to query/filter structured records. IndexedDB is asynchronous, supports structured data and native `Blob`/`File` storage, supports indexes for querying, and has a materially larger (browser-managed) quota. Dexie is the abstraction layer over it (see ARCHITECTURE.md).

### Quotas, persistence & eviction

- On first meaningful use, the app requests `navigator.storage.persist()` (best-effort; not guaranteed, especially on iOS Safari) to reduce the chance of the browser evicting data under storage pressure.
- `navigator.storage.estimate()` is used (future settings screen) to show the user their current usage/quota.
- Because eviction is a real risk (particularly iOS, and any browser when disk space is critically low), the product actively encourages periodic manual semester export as a backup — export is not merely a "nice to have," it is the mitigation for storage-eviction risk.

### Atomicity & migrations

- Multi-table writes that must be consistent (e.g., creating a Task and updating a Unit's task-order) use a single Dexie `transaction('rw', [...tables], fn)`.
- Schema changes use Dexie's `.version(n).stores(...)` with explicit `.upgrade()` functions where data must be transformed — never a silent drop-and-recreate of a table containing user data.
- Every migration is additive-by-default: new optional fields, new tables. Field removal/renaming (rare) is done via an upgrade function that copies data forward, not a version bump that abandons it.

## Entity Overview

```
academic-os-preferences DB:
  AppPreferences (singleton)
  Tag (global, persists across semesters)
        ┊
        ┊  Course.tagIds[] — cross-database reference,
        ┊  resolved in application code, not a DB-level join
        ┊
academic-os-semester DB:
  Semester 1─* Course *┈* Tag  (association only; Tag itself lives in the other DB)
  Course 1─* Unit
  Unit 1─* ContentBlock ──(file/image/video blocks reference)──> Blob
  Unit 1─* Task            Course 1─* Task (task may attach to a Unit, or stand alone under a Course, or be fully standalone)
  Task  1─* TaskCompletionEvent (append-only history log)
  Course 1─* ScheduleTemplate 1─* ScheduleOccurrence
  Course 1─* GradeCategory (self-referencing parent for nesting)
  Course 1─* GradeEntry (*─1 GradeCategory, optional)
  Course 1─* GradeBoundary
  Unit  1─* PracticeEntry
  Semester 1─* WeeklyCheckIn
```

## Entities

### AppPreferences (singleton, `academic-os-preferences` DB)
| Field | Notes |
|---|---|
| theme | e.g. `system \| light \| dark` |
| notificationsEnabled | bool — **implemented (Stage 3)** as `AppPreferences.notificationsEnabled`, real persisted state behind Settings' "Class reminders" toggle; **since Stage 5** this single toggle also gates the real notification engine baseline (`src/domain/notifications.ts` / `useClassReminders.ts` — ARCHITECTURE.md §"Notifications — platform constraints"). Reminder lead-time granularity from the original `notificationPrefs` sketch is still a fixed, hand-picked default (`REMINDER_LEAD_MINUTES = 10`) rather than a per-user configurable setting — an explicit, bounded Stage 5 scope choice (PRODUCT_SPEC.md §9 itself calls configurable timing out as "future"), not an oversight. |
| hasCompletedOnboarding | bool |
| lastExportReminderAt | drives a future "you haven't exported in a while" nudge |

`Tag` (below) is a separate table in this same `academic-os-preferences` database — it is not a field on this singleton, just co-located with it because both must survive a semester reset.

### Semester
| Field | Notes |
|---|---|
| id | stable id |
| academicYear | e.g. "Year 2" |
| name/number | e.g. "Semester 1" |
| startDate?, endDate? | optional |
| createdAt, updatedAt | |

### Tag — **global, persistent taxonomy (`academic-os-preferences` DB)** — resolved
| Field | Notes |
|---|---|
| id, name, color | required minimum per spec §2 |
| createdAt, updatedAt | |

**Resolved decision (was previously an open question):** Tags are a global, application-level personal taxonomy, not scoped to a semester. A Tag definition (e.g. `ZC`, `University`, `AI`) is created once and is available and reusable across every semester; the user never has to recreate it. Tags therefore live in the `academic-os-preferences` database, alongside `AppPreferences`, specifically so "Start New Semester" cannot delete them.

Courses reference Tags via `Course.tagIds[]`, which lives in the *semester* database (`academic-os-semester`) because the association is per-course, and Courses are semester-scoped. **The association is course-specific and semester-scoped; the Tag definition itself is not.** When a semester is cleared, its Courses (and therefore their `tagIds` associations) are deleted along with the rest of the semester workspace, but the global `Tag` rows in `academic-os-preferences` are never touched. See "Cross-database references are not enforceable at the database layer" above for how this association is resolved without a DB-level foreign key.

### Course
| Field | Notes |
|---|---|
| id, name (required) | |
| code? | never required (spec §3) |
| instructor? | |
| description? | |
| tagIds[] | |
| order | for course-list ordering |
| createdAt, updatedAt | |
| metadata? | small forward-compatible free-form bag (`Record<string, string \| number \| boolean>`) so genuinely minor future attributes don't require a breaking migration |

### Unit
| Field | Notes |
|---|---|
| id, courseId | |
| title | |
| type | free string; UI offers a default suggested list (**approved**: Lecture, Tutorial, Section, Lab, Video, Chapter, Assignment, Workshop) plus custom — never a closed enum. Independent from `ScheduleTemplate.type` (schedule event types) even though the two lists share overlapping vocabulary — see PRODUCT_SPEC.md §7 note. |
| order | |
| createdAt, updatedAt | |

### ContentBlock (discriminated union on `type`)
| Common fields | title (user-facing, independent of file name), unitId, order, createdAt, updatedAt |
|---|---|
| `type: "text"` | `content: string` — **implemented (Stage 3), approved direction:** Markdown-flavored source text supporting headings, bold/italic, lists, links, and inline/code blocks, not plain text only. The stored value is always the raw Markdown-style source; rendering always goes through a safe parse-and-sanitize step (never raw HTML passthrough) — see SECURITY.md §1. The chosen implementation (Stage 2, reused unchanged by Stage 3's editor) is a small hand-written parser (`src/lib/safeMarkdown.tsx`) that builds React elements directly from source text — never an HTML string, never `dangerouslySetInnerHTML` — rather than pulling in a third-party Markdown/editor dependency. |
| `type: "file"` | `blobId`, `originalFileName`, `mimeType`, `sizeBytes` |
| `type: "image"` | `blobId`, `originalFileName`, `mimeType`, `sizeBytes` |
| `type: "video"` | `blobId`, `originalFileName`, `mimeType`, `sizeBytes` |

New block types (e.g. `link`, `checklist`, `audio`) are added as new union members — additive, no redesign. Full CRUD/reorder behavior is **implemented (Stage 3)** — `src/data/repositories/contentBlockRepository.ts`.

### Blob (dedicated table, deliberately separate from ContentBlock metadata) — **implemented (Stage 3)**
| Field | Notes |
|---|---|
| id | referenced by ContentBlock.blobId |
| mimeType, sizeBytes | validated at intake — see SECURITY.md and `src/domain/contentValidation.ts` (per-block-type size caps and declared-MIME-type allow-lists) |
| data | `Blob` |
| createdAt | |

Kept in its own table so metadata-only queries (rendering a unit's block list) never pull binary payloads into memory. Added to `academic-os-semester` as Dexie schema **version 2** (`src/data/db.ts`) — a purely additive migration (a new store, no existing store's index signature changed), so no `.upgrade()` transform was needed.

### Task
| Field | Notes |
|---|---|
| id | |
| courseId? | denormalized for central task views/filters |
| unitId? | optional — a task may be unit-scoped, course-scoped-but-not-unit-scoped, or fully standalone |
| title | |
| dueDate? | drives Overdue/Today/Upcoming grouping via the shared academic-week/day utility |
| completed: boolean | current state — cheap to query for list rendering |
| completedAt? | see semantics below |
| createdAt, updatedAt | |

### TaskCompletionEvent — **part of the v1 data model, in the initial Dexie schema (Stage 2)**, not deferred

`Task.completed` + `Task.completedAt` alone cannot represent a task that is toggled **Incomplete → Complete → Incomplete → Complete**: a single `completedAt` timestamp loses every transition but the latest. Because PRODUCT_SPEC.md §6/§13 require true historical completion data for analytics (e.g. "was this task completed on time" across a semester) and §16 requires the semester export to preserve raw analytics source data, an append-only event log is required from the start, not added later.

| Field | Notes |
|---|---|
| id | |
| taskId | references `Task` |
| toggledTo: boolean | `true` = this event marks the task complete; `false` = this event marks it incomplete again |
| at | timestamp of this specific transition |

**Semantics (must stay consistent wherever Task completion is read or written):**
- Every toggle, in either direction, appends a new `TaskCompletionEvent` row. The log is append-only — existing events are never edited or deleted except via the cascade rule below.
- `Task.completed` and `Task.completedAt` are **derived convenience fields for current-state queries only** (e.g. rendering today's task list without scanning history):
  - When a task is toggled to complete, `Task.completed = true` and `Task.completedAt` is set to that event's `at`.
  - When a task is toggled back to incomplete, `Task.completed = false` and `Task.completedAt` becomes `null`/`undefined` — it does **not** retain the previous completion timestamp.
  - The full history of every transition (including ones now "overwritten" on the `Task` row) remains permanently available via `TaskCompletionEvent`, which is the actual source of truth for analytics and export, not the denormalized fields on `Task`.
- Writing a completion toggle updates `Task` and inserts the `TaskCompletionEvent` row inside a single Dexie transaction (see §"Atomicity & migrations"), so the two are never out of sync.

**Deletion behavior:** deleting a `Task` cascades to delete its `TaskCompletionEvent` rows, consistent with the existing Course/Unit → Task cascade-delete rule (see "Referential Integrity & Deletion Rules" below) — the event log is scoped to the lifetime of a task that still exists; there is no dangling-event use case since a deleted task cannot be shown or analyzed anymore.

**Export behavior:** Semester Export (§16 of the product spec) **must** include full `TaskCompletionEvent` history for every task present in the semester at export time, precisely because it is raw analytics source data that a future app version needs to recompute completion-based insights (e.g. "completed on time" rates) — see "Archive Schema" below.

### ScheduleTemplate vs. ScheduleOccurrence

This is the model called out explicitly in product spec §8 and requires care:

- **ScheduleTemplate** — the recurring weekly pattern: `id, courseId, type (lecture/tutorial/lab/custom), dayOfWeek (aligned to the Sat–Fri week), startTime, endTime, location?, instructor?, effectiveFrom?/effectiveTo? (recurrence range), active: boolean, createdAt, updatedAt`. Editing a template changes the pattern going forward only.
- **ScheduleOccurrence** — a specific dated instance: `id, scheduleTemplateId, date, status ("attended" | "missed" | "cancelled" | "unmarked"), notes?, createdAt, updatedAt`, plus **denormalized snapshot fields** (`courseId`, `type`, `startTime`, `endTime`, `location`) copied from the template at occurrence-creation time.

**Why denormalize a snapshot onto the occurrence:** if the user later edits or deletes the template (e.g. moves the lecture to a new room, or the course is renamed), *past* attendance records must not silently change meaning or become orphaned. The occurrence remembers what was true when it happened; the template only describes what's currently scheduled going forward.

**Generation strategy:** occurrences are generated **lazily/on demand** when a given week is viewed or attendance is marked — not pre-materialized for an entire semester up front. This avoids an unbounded, mostly-unused table and keeps the model correct even if templates change mid-semester. Attendance percentage calculations sum `attended / (attended + missed)` per course, excluding `cancelled` and `unmarked` from the denominator (per product spec §8).

### GradeCategory
| Field | Notes |
|---|---|
| id, courseId | |
| parentCategoryId? | enables nesting, e.g. Coursework → Quizzes |
| name, maxPoints | |

### GradeEntry
| Field | Notes |
|---|---|
| id, courseId | |
| categoryId? | **null in Simple Mode** (unassigned), set in Structured Mode |
| label | e.g. "Quiz 1" |
| scoreEarned, scoreMax | |
| recordedAt | |
| createdAt, updatedAt | |

**Why one GradeEntry shape serves both modes:** Simple Mode is just "GradeEntries with no category," and the course's overall structure (e.g. `total: 100, coursework: 60, final: 40`) is an optional, separately-stored `GradeCategory` tree that a course may or may not define. This is what makes "8/10 recorded" (sum of uncategorized entries) representable without it being misread as "8/60 coursework" — unrecorded categories/entries are simply absent from the sum, never implicitly zero. A course can start with bare entries and grow real categories later without migrating existing entries (they simply remain uncategorized, or the user reassigns them).

### GradeBoundary
| Field | Notes |
|---|---|
| id, courseId (or a semester-level default template applied to new courses) | |
| label (e.g. "A+"), minPercent | |
| passThreshold | configurable per course, not hard-coded |

### PracticeEntry (structurally distinct from GradeEntry — never merged)
| Field | Notes |
|---|---|
| id, unitId (or courseId for course-level practice) | |
| label, scoreEarned, scoreMax | |
| recordedAt, createdAt, updatedAt | |

### WeeklyCheckIn
| Field | Notes |
|---|---|
| id | |
| weekStartDate | the canonical Saturday, from the shared week utility |
| energy?, focus?, stress?, overallRating? | numeric scales, all optional |
| note? | |
| createdAt, updatedAt | |

## Analytics Data Philosophy

No table in this model stores a *final computed* analytic (e.g. "semester GPA") as its source of truth. Every number the analytics stage will show is derivable from the raw tables above (GradeEntry, PracticeEntry, ScheduleOccurrence, Task, TaskCompletionEvent). This is deliberate: it lets future app versions improve or fix an analytics formula and have it apply retroactively to historical data, and it is exactly what makes the semester archive (§ below) useful for re-analysis after import.

## Archive Schema (Semester Export)

A versioned envelope, e.g.:

```json
{
  "archiveVersion": 1,
  "exportedAt": "2026-07-26T00:00:00.000Z",
  "appVersion": "0.3.0",
  "semester": { ... },
  "tags": [...],
  "courses": [...],
  "units": [...],
  "contentBlockMetadata": [...],
  "tasks": [...],
  "taskCompletionEvents": [...],
  "scheduleTemplates": [...],
  "scheduleOccurrences": [...],
  "gradeCategories": [...],
  "gradeEntries": [...],
  "gradeBoundaries": [...],
  "practiceEntries": [...],
  "weeklyCheckIns": [...]
}
```

- `archiveVersion` is an integer bumped on any breaking shape change; the importer dispatches on it and can run migration steps for older versions (see SECURITY.md §"Import Threat Model" for validation/rejection rules).
- `contentBlockMetadata` includes block titles/types/ordering but **not** blob binary data by default (product spec §16) — large originals are excluded from this archive.
- `tags` is a **snapshot** of the global `Tag` definitions actually referenced by this semester's courses at export time (id, name, color) — even though Tags are now global/persistent app data (see §Tag above), the archive embeds the definitions it depends on so the export remains self-contained and reconstructable even if the global Tag table later changes or the archive is opened by a different install.
- `taskCompletionEvents` is the full append-only completion-history log for every task in the semester — included precisely because it is raw analytics source data, per the approved decision that Semester Export must preserve `TaskCompletionEvent` history, not just current `Task.completed` state.
- The media export (§17 of the product spec) is a separate, optional zip keyed by personal-image blobs specifically, organized by Course/Unit folder names, and is versioned independently since it can evolve on its own schedule.

## Referential Integrity & Deletion Rules — **implemented (Stage 3)**, `src/data/repositories/{course,unit,task,grade}Repository.ts`

- Deleting a Course cascades to its Units, ContentBlocks (and their Blobs), Tasks (and their TaskCompletionEvents), ScheduleTemplates (and their Occurrences), GradeCategories/Entries/Boundaries, and PracticeEntries — all scoped to that course. The Course's `tagIds[]` association simply disappears with it; the referenced global `Tag` rows (a different database) are never touched.
- Deleting a Unit cascades to its ContentBlocks/Blobs, unit-scoped Tasks (and their TaskCompletionEvents), and PracticeEntries; course-level Tasks/PracticeEntries (not tied to that unit) are unaffected.
- Deleting a Task cascades to delete its `TaskCompletionEvent` rows — the event log only has meaning for a task that still exists; see §TaskCompletionEvent above.
- Deleting a ScheduleTemplate does **not** delete existing ScheduleOccurrences (they retain their denormalized snapshot and remain valid historical attendance records); it only stops generating future occurrences.
- Deleting a global `Tag` (from Settings, an application-level operation, not a semester operation) does **not** cascade-delete anything in the semester database; any `Course.tagIds` entries that now point to a nonexistent Tag are treated as stale and filtered out at read time (see "Cross-database references are not enforceable at the database layer" above) — no cross-database cascade is performed.
- Deleting a GradeCategory un-assigns (never deletes) any GradeEntry rows that referenced it — they become unassigned entries, the same "uncategorized, never zero" honesty rule §GradeEntry already establishes, extended to the deletion case. Deleting a top-level category also un-nests (never deletes) its child categories.
- "Start New Semester" deletes/recreates the entire `academic-os-semester` database (Semester, Course, Unit, ContentBlock, Blob, Task, TaskCompletionEvent, ScheduleTemplate, ScheduleOccurrence, GradeCategory, GradeEntry, GradeBoundary, PracticeEntry, WeeklyCheckIn — everything above) but never touches `academic-os-preferences` (AppPreferences and the global Tag table survive unchanged).
- IDs are stable, generated client-side (e.g. UUID/ULID) at creation time and never reused — this matters for export/import round-tripping and for occurrence snapshots referencing a template that may later be deleted.
