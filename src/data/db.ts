/**
 * Dexie/IndexedDB foundation — implements DATA_MODEL.md §"Storage Architecture".
 *
 * Two separate databases, deliberately: `academic-os-preferences` (survives
 * "Start New Semester" — AppPreferences + the global, persistent Tag table)
 * and `academic-os-semester` (the single active semester workspace).
 * `Course.tagIds` is therefore a *cross-database* reference, resolved at
 * the application/repository layer, never as a Dexie-level foreign key —
 * see DATA_MODEL.md §"Cross-database references are not enforceable at the
 * database layer."
 *
 * Stage 2 scope: the full v1 schema is declared here (including
 * TaskCompletionEvent from the initial version, per the Stage 0
 * finalization decision), but only the Preferences, Tag, and Semester
 * repositories are implemented in Stage 2 — Course/Unit/Task/Schedule/
 * Grade/Practice repositories are Stage 3+ work. Declaring the schema now
 * (rather than growing it ad hoc per stage) is what lets those later
 * stages be additive Dexie version bumps instead of redesigns.
 */
import Dexie, { type EntityTable } from "dexie";
import type {
  AppPreferences,
  Tag,
  Semester,
  Course,
  Unit,
  ContentBlock,
  StoredBlob,
  Task,
  TaskCompletionEvent,
  ScheduleTemplate,
  ScheduleOccurrence,
  GradeCategory,
  GradeEntry,
  GradeBoundary,
  PracticeEntry,
  WeeklyCheckIn,
} from "@/types/entities";

export class PreferencesDatabase extends Dexie {
  appPreferences!: EntityTable<AppPreferences, "id">;
  tags!: EntityTable<Tag, "id">;

  constructor() {
    super("academic-os-preferences");
    this.version(1).stores({
      appPreferences: "id",
      tags: "id, name",
    });
  }
}

export class SemesterDatabase extends Dexie {
  semester!: EntityTable<Semester, "id">;
  courses!: EntityTable<Course, "id">;
  units!: EntityTable<Unit, "id">;
  contentBlocks!: EntityTable<ContentBlock, "id">;
  blobs!: EntityTable<StoredBlob, "id">;
  tasks!: EntityTable<Task, "id">;
  taskCompletionEvents!: EntityTable<TaskCompletionEvent, "id">;
  scheduleTemplates!: EntityTable<ScheduleTemplate, "id">;
  scheduleOccurrences!: EntityTable<ScheduleOccurrence, "id">;
  gradeCategories!: EntityTable<GradeCategory, "id">;
  gradeEntries!: EntityTable<GradeEntry, "id">;
  gradeBoundaries!: EntityTable<GradeBoundary, "id">;
  practiceEntries!: EntityTable<PracticeEntry, "id">;
  weeklyCheckIns!: EntityTable<WeeklyCheckIn, "id">;

  constructor() {
    super("academic-os-semester");
    this.version(1).stores({
      semester: "id",
      courses: "id, order",
      units: "id, courseId, [courseId+order]",
      contentBlocks: "id, unitId, [unitId+order]",
      tasks: "id, courseId, unitId, dueDate, completed",
      taskCompletionEvents: "id, taskId, at",
      scheduleTemplates: "id, courseId, dayOfWeek, active",
      scheduleOccurrences: "id, scheduleTemplateId, date, courseId",
      gradeCategories: "id, courseId, parentCategoryId",
      gradeEntries: "id, courseId, categoryId",
      gradeBoundaries: "id, courseId",
      practiceEntries: "id, unitId, courseId",
      weeklyCheckIns: "id, weekStartDate",
    });
    // Stage 3: adds the Blob table (DATA_MODEL.md §Blob) for file/image/video
    // content-block uploads. Purely additive — no existing store's index
    // signature changes, so no .upgrade() transform is needed.
    this.version(2).stores({
      blobs: "id",
    });
  }
}

export const preferencesDb = new PreferencesDatabase();
export const semesterDb = new SemesterDatabase();

/** Deletes and recreates the semester workspace only — "Start New Semester"
 * (PRODUCT_SPEC.md §19). Never touches `preferencesDb` (AppPreferences,
 * global Tags survive), matching Cross-Cutting Invariant #4/#10. */
export async function clearSemesterWorkspace(): Promise<void> {
  await semesterDb.delete();
  await semesterDb.open();
}
