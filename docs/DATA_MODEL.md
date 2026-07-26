# Data Model — Academic OS

> **Source-of-truth scope:** entities, relationships, invariants, and the persistence model. Business rules that motivate this shape live in [PRODUCT_SPEC.md](./PRODUCT_SPEC.md); tooling choices live in [ARCHITECTURE.md](./ARCHITECTURE.md).
>
> This is a **conceptual** data model for planning purposes — field names/types illustrate intent, not a final committed schema. The actual Dexie schema is authored in Stage 2.

## Storage Architecture

Two separate IndexedDB databases via Dexie, deliberately kept apart so a destructive semester reset can never touch preferences:

1. **`academic-os-preferences`** — app-level settings that must survive "New Semester": theme, notification preferences, last-export reminders, onboarding flags. Tiny, long-lived, never bulk-deleted.
2. **`academic-os-semester`** — the single active semester workspace: Semester, Tag, Course, Unit, ContentBlock, Blob, Task, ScheduleTemplate, ScheduleOccurrence, GradeCategory, GradeEntry, GradeBoundary, PracticeEntry, WeeklyCheckIn. "Start New Semester" deletes/recreates this entire database; `academic-os-preferences` is untouched.

The app operates on **one active semester at a time** (per product spec §15) — there is no in-app multi-semester browsing in v1. History beyond the active semester is preserved by explicit export (§16), not by retaining every past semester's rows inside the live database indefinitely. (Whether to later support in-app historical browsing of past exported semesters is an open question — see STAGE_0_REPORT.md.)

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
AppPreferences (own DB)

Semester 1─* Tag
Semester 1─* Course *─* Tag
Course 1─* Unit
Unit 1─* ContentBlock ──(file/image/video blocks reference)──> Blob
Unit 1─* Task            Course 1─* Task (task may attach to a Unit, or stand alone under a Course, or be fully standalone)
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
| notificationPrefs | reminder lead time, enabled flags — see PRODUCT_SPEC §9 |
| hasCompletedOnboarding | bool |
| lastExportReminderAt | drives a future "you haven't exported in a while" nudge |

### Semester
| Field | Notes |
|---|---|
| id | stable id |
| academicYear | e.g. "Year 2" |
| name/number | e.g. "Semester 1" |
| startDate?, endDate? | optional |
| createdAt, updatedAt | |

### Tag
| Field | Notes |
|---|---|
| id, name, color | required minimum per spec §2 |
| createdAt, updatedAt | |

Tags attach to Courses via a join table/array of ids (`Course.tagIds`). **Open question**: whether tags should persist as a personal taxonomy across semesters (global) or reset per semester workspace (current default — see STAGE_0_REPORT.md).

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
| type | free string; UI offers a default suggested list (Lecture, Tutorial, Section, Lab, Video, Chapter, Assignment, Workshop) plus custom |
| order | |
| createdAt, updatedAt | |

### ContentBlock (discriminated union on `type`)
| Common fields | title (user-facing, independent of file name), unitId, order, createdAt, updatedAt |
|---|---|
| `type: "text"` | `content: string` |
| `type: "file"` | `blobId`, `originalFileName`, `mimeType`, `sizeBytes` |
| `type: "image"` | `blobId`, `originalFileName`, `mimeType`, `sizeBytes` |
| `type: "video"` | `blobId`, `originalFileName`, `mimeType`, `sizeBytes` |

New block types (e.g. `link`, `checklist`, `audio`) are added as new union members — additive, no redesign. Full CRUD/reorder behavior is designed here but implemented in Stage 3.

### Blob (dedicated table, deliberately separate from ContentBlock metadata)
| Field | Notes |
|---|---|
| id | referenced by ContentBlock.blobId |
| mimeType, sizeBytes | validated at intake — see SECURITY.md |
| data | `Blob` |
| createdAt | |

Kept in its own table so metadata-only queries (rendering a unit's block list) never pull binary payloads into memory.

### Task
| Field | Notes |
|---|---|
| id | |
| courseId? | denormalized for central task views/filters |
| unitId? | optional — a task may be unit-scoped, course-scoped-but-not-unit-scoped, or fully standalone |
| title | |
| dueDate? | drives Overdue/Today/Upcoming grouping via the shared academic-week/day utility |
| completed: boolean, completedAt? | |
| createdAt, updatedAt | |

A lightweight `TaskCompletionEvent` log (taskId, toggledTo, at) is a documented **future-compatible addition** (new table, no migration pain) if analytics ever need full completion history beyond current state + timestamp; not required for v1 since `completed` + `completedAt` already answers "was it done and when."

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

No table in this model stores a *final computed* analytic (e.g. "semester GPA") as its source of truth. Every number the analytics stage will show is derivable from the raw tables above (GradeEntry, PracticeEntry, ScheduleOccurrence, Task). This is deliberate: it lets future app versions improve or fix an analytics formula and have it apply retroactively to historical data, and it is exactly what makes the semester archive (§ below) useful for re-analysis after import.

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
- The media export (§17 of the product spec) is a separate, optional zip keyed by personal-image blobs specifically, organized by Course/Unit folder names, and is versioned independently since it can evolve on its own schedule.

## Referential Integrity & Deletion Rules (to formalize in Stage 2/3)

- Deleting a Course cascades to its Units, ContentBlocks (and their Blobs), Tasks, ScheduleTemplates (and their Occurrences), GradeCategories/Entries/Boundaries, and PracticeEntries — all scoped to that course.
- Deleting a Unit cascades to its ContentBlocks/Blobs, unit-scoped Tasks, and PracticeEntries; course-level Tasks/PracticeEntries (not tied to that unit) are unaffected.
- Deleting a ScheduleTemplate does **not** delete existing ScheduleOccurrences (they retain their denormalized snapshot and remain valid historical attendance records); it only stops generating future occurrences.
- IDs are stable, generated client-side (e.g. UUID/ULID) at creation time and never reused — this matters for export/import round-tripping and for occurrence snapshots referencing a template that may later be deleted.
