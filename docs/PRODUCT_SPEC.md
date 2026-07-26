# Product Specification — Academic OS

> **Source-of-truth scope:** This document defines *what the product does and the business rules it must obey* — not how it is built (see [ARCHITECTURE.md](./ARCHITECTURE.md)) and not the persisted shape of data (see [DATA_MODEL.md](./DATA_MODEL.md)). If a future change conflicts with this document, this document wins unless the product owner explicitly amends it.

## 1. Vision

Academic OS is a premium, local-first academic and learning management Progressive Web App (PWA) — a personal academic operating system. It helps a student organize courses, learning units, materials, notes, tasks, weekly schedule, attendance, official grades, practice performance, study analytics, semester performance, optional wellbeing check-ins, and semester export/backup.

The product supports both traditional university courses and non-university learning (YouTube courses, self-study, online courses). It must never force a rigid university-only structure.

## 2. Core Hierarchy

```
Course → Unit → Content Block
```

Courses are the top-level learning containers. Units are logical sub-divisions of a course. Content Blocks are the atomic pieces of material/notes a user attaches to a Unit.

### Tags vs. Unit Types — do not conflate

These are two independent concepts and must never be merged into one field or enum:

- **Tags** are free-form, user-defined, colored labels attached to **Courses** (many-to-many). Examples: `ZC`, `University`, `YouTube`, `Self Study`, `AI`, `Semester 2`. A Tag has at minimum a **name** and a **color**. Tags are how the product models "kind of course" flexibly instead of hard-coding mutually exclusive course types (e.g. no hard-coded `University Course` vs `YouTube Course` type flag).
- **Unit Types** describe the pedagogical role of a single **Unit** inside a course (Lecture, Tutorial, Section, Lab, Video, Chapter, Assignment, Workshop, or a user-defined custom type). Unit types are not colored labels and are not attached to Courses.

## 3. Course Model

**Required:** course name.

**Optional:** course code, instructor/doctor name, description, tags.

Course code is intentionally optional — many non-university learning sources have no course code. The architecture must allow additional course metadata later without destructive migrations (see DATA_MODEL.md §"Schema Evolution").

## 4. Unit System

A Course contains an ordered list of Units. A Unit has: title, type (from a default suggested set, or custom), course relationship, ordering information, created/updated timestamps. Users are never forced into one fixed unit taxonomy — the default type list is a convenience, not a constraint.

## 5. Content Block System

Inside a Unit, the user assembles Content Blocks. Initial block concepts: **Text**, **File**, **Image**, **Video**. Every block has a user-facing title that is independent of any underlying original file name (e.g. a block titled "Lecture Slides" may wrap a file literally named `w4_v3_final_FINAL.pdf`).

Content blocks must eventually support create, edit (where the block type allows it), delete, and reorder. Stage 0 documents this architecture only (see DATA_MODEL.md §ContentBlock and ARCHITECTURE.md §Extensibility); it is not implemented until Stage 3.

Future block types (e.g. Link, Audio, Checklist) must be addable without redesigning the data model — see the discriminated-union approach in DATA_MODEL.md.

## 6. Task System

Units may optionally contain Tasks (e.g. "Study lecture", "Review notes", "Solve tutorial", "Solve practice questions"). Tasks belong contextually to a Unit/Course but **must also surface centrally** outside any course — the user should never need to open every course to see upcoming work.

### Canonical academic week

The application's week runs **Saturday 00:00:00 local time → Friday 23:59:59.999 local time**. This rule is centralized in exactly one utility (see ARCHITECTURE.md §"Academic Week Utility") and reused by every weekly feature: task grouping, the weekly schedule, attendance-by-week analytics, and the weekly check-in. No feature may implement its own independent week-boundary math.

### Task presentation

Tasks are grouped as: **Overdue**, **Today**, then **Upcoming** days in chronological order. Tasks support completion (done/not done). The data model must retain historical completion data (not just current state) so future analytics can answer questions like "what fraction of tasks were completed on time this semester."

## 7. Weekly Schedule

A recurring weekly schedule of Schedule Entries (Lecture, Tutorial, Section, Lab, or custom event type). Each entry may carry: related Course, event type, day of week, start time, end time, location, optional instructor, and recurrence information.

Example: `CSAI 101 — Lecture — Saturday 09:00–10:30 — Room C201`.

Stage 0 documents the data model only; day/week calendar UI is a later stage.

## 8. Attendance

Schedule events support attendance tracking with three states: **Attended**, **Missed**, **Cancelled**. Cancelled sessions must **not** count negatively toward attendance percentage (they are excluded from the denominator, not counted as a miss). Attendance history must be retained indefinitely (within the active semester) for analytics.

The architecture must distinguish **recurring schedule templates** (the weekly pattern, e.g. "CSAI 101 Lecture every Saturday 09:00–10:30") from **actual attendance occurrences** (the specific dated instance and its recorded status). See DATA_MODEL.md §"Schedule Templates vs. Occurrences" for the recommended model.

## 9. Notifications

The PWA should, within platform/browser limits, be able to remind the user of upcoming scheduled classes (e.g. "CSAI 101 — Lecture — Starts at 09:00 — Room C201"), with future configurable reminder timing.

**This is not implemented in Stage 0.** Platform constraints are researched and documented in ARCHITECTURE.md §"Notifications — Platform Constraints"; the honest summary is that reliable OS-level background reminders (app fully closed) are not achievable on all platforms without a push-capable backend, which would violate the local-first, no-mandatory-backend requirement. iOS Safari in particular has materially weaker support than desktop Chrome/Edge or Android Chrome.

## 10. Official Grades

Official grades are kept structurally and analytically separate from practice/study performance (§12). The system supports two compatible modes on the *same* underlying model (see DATA_MODEL.md §Grades):

- **Simple Mode** — record results as they come (`Quiz 1: 3/5`, `Quiz 2: 5/5` → recorded total `8/10`) without pre-declaring every category. Critically, "8/10 recorded" must never be interpreted as "8/60 coursework" — unrecorded coursework is *unknown*, not *zero*.
- **Structured Mode** — user pre-defines categories and their point allocations (e.g. `Coursework 60` → `Quizzes 10 / Assignments 10 / Midterm 20 / Project 20`, `Final 40`), then assigns individual assessments to categories.

Both modes must be representable without an incompatible data model — a course may start in Simple Mode and later adopt structure without a destructive migration.

## 11. Grade Calculations (future)

The system will eventually calculate: recorded marks, current performance, remaining available marks, maximum possible final score, required score to pass, required final-exam score, and required score to reach a target overall grade. The pass threshold is configurable per course. Grade boundaries (e.g. `A+ ≥ 90, A ≥ 85, B+ ≥ 80…`) are user-configurable, never hard-coded to one university's scale.

## 12. Practice Performance

Practice scores (e.g. "Tutorial Practice: 7/10") are **not** official grades and must remain a structurally separate concept from §10–11, even though both are "a score out of a total." The product must be able to compare attendance, task completion, practice performance, and official grades side by side without merging them into one number.

## 13. Analytics

Planned analytics: task completion, attendance, practice performance, official grades, course/unit performance, weekly and semester trends, strongest units, units needing attention, and statistical associations between behaviors and outcomes.

**Causation discipline:** the product must never present correlation as causation. Acceptable: *"Units where all study tasks were completed had a higher average practice score."* Not acceptable: *"Completing all tasks caused your grade to increase."* This rule applies to all future analytics copy and UI.

Analytics should be computed from underlying raw/structured data rather than only from stored pre-computed summaries, so future app versions can recompute improved insights from history (see DATA_MODEL.md §"Analytics Data Philosophy").

## 14. Optional Weekly Check-in

A lightweight, entirely optional self-reported weekly check-in: energy, focus, stress, overall week rating, optional note. These are **self-reported study/wellbeing indicators**, not medical or psychological diagnoses, and product copy must never imply otherwise. Historical values may later be visualized alongside academic trends.

## 15. Semester Model

The app operates on **one active semester workspace** at a time. Initial setup captures: academic year/study year, semester number/name, optional start date, optional end date (e.g. "Year 2, Semester 1"). The active semester holds the current working data. Keeping every historical semester permanently inside the live workspace is not required — history is preserved via export (§16), not by indefinite in-app accumulation.

## 16. Semester Export

Manual, explicit semester export. **Export and Clear/New-Semester (§19) are completely independent operations — export must never delete or reset data, and clearing must never be a side effect of exporting.**

The archive preserves structured data needed to reconstruct and analyze the semester: semester metadata, courses, tags, units, content *metadata* (not necessarily the original large files — see below), tasks and completion history, schedule information/history, attendance, official grades, practice scores, weekly check-ins, relevant timestamps, and analytics source data. Prefer raw structured data over rendered analytics so future app versions can recompute better insights.

Large original course materials (lecture PDFs/videos) are **not** included in this archive by default — see §17 for personal media. The archive format is versioned (see DATA_MODEL.md §"Archive Schema").

## 17. Media Export (separate, future)

A second, optional export dedicated to *personal* images the user created (handwritten notes, whiteboard photos, personal diagrams) — not original course-provided PDFs/videos. Conceptual layout:

```
Year-2-Semester-1-Media.zip
  CSAI-201/
    Lecture-01/
      handwritten-note-01.jpg
      diagram.jpg
  MATH-202/
    Tutorial-03/
      solution.jpg
```

## 18. Import (future)

Semester archives must eventually be importable. Import is treated as **untrusted input**: schema validation, archive-version compatibility/migration, corrupted-archive handling, rejection of invalid/malicious data, and size limits are all required (see SECURITY.md §"Import Threat Model"). Importing a historical archive must never silently destroy the current semester — the safe UX is: warn, confirm, and only replace the active workspace after explicit, unambiguous user confirmation (with the option to export the current semester first).

## 19. New Semester / Clear Data

A separate, deliberately destructive action, independent of export (§16) and import (§18). Future UX: user chooses "Start New Semester" → clear warning → explicit confirmation (e.g. typed confirmation phrase) → delete the current semester workspace → **preserve application-level preferences** (theme, notification settings, etc.) → return to semester setup. There is no automatic "export then delete" chaining — the user decides both actions independently.

## 20. Local-First Requirement

No user accounts, no authentication, no mandatory cloud database, no mandatory backend, no remote storage of academic data. All academic and self-reported data lives on the user's device by default. See DATA_MODEL.md §"Storage Architecture" for how this is implemented without naively assuming `localStorage` is adequate.

## 21. PWA Requirement

Production-quality PWA: installable, standalone app-like experience, offline-capable for core local functionality after install/caching, proper web app manifest, a deliberate service-worker update strategy that avoids stale/corrupt state after deploys, responsive and mobile-first. See ARCHITECTURE.md §"PWA Strategy" for the concrete plan and platform differences.

## 22. UI/UX Process

Stage 0 does **not** design or build UI. A dedicated Stage 1 (UI/UX + Figma) precedes implementation. This document lists required concepts and constraints for that stage to work from — not screens or visual design.

### Screens/areas the Stage 1 designer must account for (informational, not exhaustive)
- Semester setup / switch
- Home / Today (tasks due, today's schedule)
- Central Task list (Overdue / Today / Upcoming)
- Course list (with tag filters)
- Course detail (units list, tags, code/instructor/description)
- Unit detail (content blocks, tasks, practice performance)
- Content block viewer/editor per type (text, file, image, video)
- Weekly schedule (week view)
- Attendance marking per schedule occurrence
- Grades — course grade view (simple vs. structured mode), category breakdown
- Practice performance entry/view (kept visually distinct from grades)
- Weekly check-in (optional, lightweight)
- Analytics dashboard (course/unit/semester trends)
- Settings (theme, notification preferences, data — export/media export/import/new semester)
- Import/export flows, including destructive-action confirmation

## Cross-Cutting Invariants (must never regress)

1. Course code is never mandatory.
2. Tags (Course-level, name+color) and Unit Types (Unit-level) are never the same field.
3. Official Grades and Practice Performance are always structurally separate.
4. Export never deletes; Clear/New Semester never happens implicitly.
5. The academic week is always Saturday 00:00:00 → Friday 23:59:59.999 local time, computed by one shared utility.
6. Cancelled schedule occurrences never count negatively toward attendance %.
7. No account/login/mandatory backend is introduced for core functionality.
8. Analytics language never claims causation from correlation.
9. Weekly check-in data is never framed as medical/psychological diagnosis.
