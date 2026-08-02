/**
 * Import — pure validation/conversion logic (PRODUCT_SPEC.md §18,
 * SECURITY.md §3 "Import / Archive Handling — Untrusted Input"). Kept
 * separate from `src/data/repositories/importRepository.ts` (which owns
 * Dexie I/O) the same way `archive.ts`/`exportRepository.ts` are split, so
 * every rule here is unit-testable without a browser/IndexedDB.
 *
 * Every imported archive — including the user's own prior export — is
 * treated as fully untrusted:
 *   1. `JSON.parse` happens in a try/catch (see importRepository) — never a
 *      crash on malformed JSON.
 *   2. `archiveVersion` is checked *before* full schema validation so a
 *      too-new/too-old archive gets a specific, honest reason instead of a
 *      generic "shape didn't match" error.
 *   3. The full payload is validated against the same versioned Zod schema
 *      Export self-checks against (`parseSemesterArchive`).
 *   4. Every internal Dexie record is constructed field-by-field from the
 *      validated data (allow-listed copy) — never `{...validated}` or
 *      `Object.assign` on the raw parsed JSON — so a crafted `__proto__`/
 *      `constructor` key in attacker-controlled JSON can't surprise
 *      anything downstream.
 */
import { createId } from "@/domain/id";
import { ARCHIVE_VERSION, parseSemesterArchive, type SemesterArchive } from "@/domain/archive";
import { TAG_COLORS, type TagColor } from "@/types/entities";
import type {
  Course,
  ContentBlock,
  GradeBoundary,
  GradeCategory,
  GradeEntry,
  PracticeEntry,
  ScheduleOccurrence,
  ScheduleTemplate,
  Semester,
  Tag,
  Task,
  TaskCompletionEvent,
  Unit,
  WeeklyCheckIn,
} from "@/types/entities";

/** A generous but bounded cap for structured JSON — large enough for years
 * of real semester data, small enough to reject a pathological/corrupted
 * file before it's ever parsed into memory (SECURITY.md §3). Media zips
 * use a separate, larger limit — see mediaExport's own path; this repo
 * doesn't yet import media zips (Import only covers the JSON archive,
 * matching PRODUCT_SPEC.md §18's scope). */
export const MAX_ARCHIVE_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export class ImportFileTooLargeError extends Error {
  constructor(limitBytes: number) {
    super(
      `This file is larger than the ${Math.round(limitBytes / (1024 * 1024))} MB import limit.`,
    );
    this.name = "ImportFileTooLargeError";
  }
}

export class ImportParseError extends Error {
  constructor(message = "This file isn't valid JSON and couldn't be read as a semester archive.") {
    super(message);
    this.name = "ImportParseError";
  }
}

export class ImportVersionError extends Error {
  constructor(
    readonly kind: "too-new" | "too-old",
    message: string,
  ) {
    super(message);
    this.name = "ImportVersionError";
  }
}

/** Reads `archiveVersion` off an already-`JSON.parse`d value without
 * trusting anything else about its shape, so a version mismatch can be
 * reported specifically before the full (stricter) schema check runs. */
function readArchiveVersion(data: unknown): number | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const value = (data as Record<string, unknown>).archiveVersion;
  return typeof value === "number" ? value : undefined;
}

/**
 * Defensive parse + validate of raw archive text (SECURITY.md §3, steps
 * 1–3 above). Throws a specific, typed error for every rejection reason —
 * never lets a malformed/hostile file crash the caller, and never touches
 * application state itself (that's `importRepository.importSemesterArchive`,
 * called only after the user explicitly confirms).
 */
export function parseAndValidateArchiveText(text: string): SemesterArchive {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ImportParseError();
  }

  const version = readArchiveVersion(data);
  if (version !== undefined && version > ARCHIVE_VERSION) {
    throw new ImportVersionError(
      "too-new",
      `This archive was exported by a newer version of Academic OS (archive version ${version}, this app understands version ${ARCHIVE_VERSION}). Update the app and try again.`,
    );
  }
  if (version !== undefined && version < ARCHIVE_VERSION) {
    // No archive version below the current one has ever existed yet
    // (ARCHIVE_VERSION has only ever been 1) — there is nothing to migrate
    // from. This branch exists so that if/when ARCHIVE_VERSION is bumped,
    // an older archive gets an honest "not supported yet" message instead
    // of silently falling through to a generic shape-mismatch error.
    throw new ImportVersionError(
      "too-old",
      `This archive uses an older format (archive version ${version}) that this version of Academic OS doesn't know how to migrate yet.`,
    );
  }

  // parseSemesterArchive re-validates archiveVersion too (z.literal) plus
  // every other field — this call is what actually rejects malformed/
  // incomplete/wrong-typed payloads, via ArchiveValidationError.
  return parseSemesterArchive(data);
}

export interface ImportSummary {
  academicYear: string;
  label: string;
  exportedAt: string;
  courseCount: number;
  unitCount: number;
  taskCount: number;
  gradeEntryCount: number;
  practiceEntryCount: number;
}

export function summarizeArchive(archive: SemesterArchive): ImportSummary {
  return {
    academicYear: archive.semester.academicYear,
    label: archive.semester.label,
    exportedAt: archive.exportedAt,
    courseCount: archive.courses.length,
    unitCount: archive.units.length,
    taskCount: archive.tasks.length,
    gradeEntryCount: archive.gradeEntries.length,
    practiceEntryCount: archive.practiceEntries.length,
  };
}

export interface ConvertedArchive {
  semester: Semester;
  tags: Tag[];
  courses: Course[];
  units: Unit[];
  contentBlocks: ContentBlock[];
  tasks: Task[];
  taskCompletionEvents: TaskCompletionEvent[];
  scheduleTemplates: ScheduleTemplate[];
  scheduleOccurrences: ScheduleOccurrence[];
  gradeCategories: GradeCategory[];
  gradeEntries: GradeEntry[];
  gradeBoundaries: GradeBoundary[];
  practiceEntries: PracticeEntry[];
  weeklyCheckIns: WeeklyCheckIn[];
}

function isTagColor(value: string): value is TagColor {
  return (TAG_COLORS as readonly string[]).includes(value);
}

/**
 * Converts a validated archive into internal Dexie record shapes, field by
 * field (never a spread of the validated object) — see module doc, point
 * 4. This is where every table's data lands; `importRepository` is
 * responsible only for the actual transactional Dexie writes.
 */
export function convertArchiveToInternalRecords(archive: SemesterArchive): ConvertedArchive {
  const semester: Semester = {
    id: archive.semester.id,
    academicYear: archive.semester.academicYear,
    label: archive.semester.label,
    startDate: archive.semester.startDate,
    endDate: archive.semester.endDate,
    createdAt: archive.semester.createdAt,
    updatedAt: archive.semester.updatedAt,
  };

  const tags: Tag[] = archive.tags.map((t) => ({
    id: t.id,
    name: t.name,
    // Defensive fallback (SECURITY.md §10): an archive's tag color is an
    // unconstrained string in the schema (kept loose for forward
    // compatibility); anything outside the current curated palette falls
    // back to a safe default rather than being written verbatim.
    color: isTagColor(t.color) ? t.color : "slate",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  const courses: Course[] = archive.courses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    instructor: c.instructor,
    description: c.description,
    tagIds: [...c.tagIds],
    order: c.order,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  const units: Unit[] = archive.units.map((u) => ({
    id: u.id,
    courseId: u.courseId,
    title: u.title,
    type: u.type,
    order: u.order,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }));

  // File/image/video blocks lose their binary data by design (semester
  // archives never include blob binaries — PRODUCT_SPEC.md §16); a fresh,
  // never-stored blobId is generated so the record still satisfies
  // ContentBlock's shape. The blob simply won't resolve on read, which the
  // existing ContentBlockCard/useBlobUrl path already handles defensively
  // (no preview/download link renders — see STAGE_1A_UX_ARCHITECTURE.md
  // §T's "file unavailable" requirement). This is a known, documented
  // import limitation, not a bug.
  const contentBlocks: ContentBlock[] = archive.contentBlockMetadata.map((b) => {
    const base = {
      id: b.id,
      unitId: b.unitId,
      title: b.title,
      order: b.order,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
    if (b.type === "text") {
      return { ...base, type: "text", content: b.content ?? "" };
    }
    return {
      ...base,
      type: b.type,
      blobId: createId(),
      originalFileName: b.originalFileName ?? b.title,
      mimeType: b.mimeType ?? "application/octet-stream",
      sizeBytes: b.sizeBytes ?? 0,
    };
  });

  const tasks: Task[] = archive.tasks.map((t) => ({
    id: t.id,
    courseId: t.courseId,
    unitId: t.unitId,
    title: t.title,
    dueDate: t.dueDate,
    completed: t.completed,
    completedAt: t.completedAt,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  const taskCompletionEvents: TaskCompletionEvent[] = archive.taskCompletionEvents.map((e) => ({
    id: e.id,
    taskId: e.taskId,
    toggledTo: e.toggledTo,
    at: e.at,
  }));

  const scheduleTemplates: ScheduleTemplate[] = archive.scheduleTemplates.map((s) => ({
    id: s.id,
    courseId: s.courseId,
    type: s.type,
    dayOfWeek: s.dayOfWeek as ScheduleTemplate["dayOfWeek"],
    startTime: s.startTime,
    endTime: s.endTime,
    location: s.location,
    instructor: s.instructor,
    active: s.active,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  const scheduleOccurrences: ScheduleOccurrence[] = archive.scheduleOccurrences.map((o) => ({
    id: o.id,
    scheduleTemplateId: o.scheduleTemplateId,
    date: o.date,
    status: o.status,
    notes: o.notes,
    courseId: o.courseId,
    type: o.type,
    startTime: o.startTime,
    endTime: o.endTime,
    location: o.location,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }));

  const gradeCategories: GradeCategory[] = archive.gradeCategories.map((g) => ({
    id: g.id,
    courseId: g.courseId,
    parentCategoryId: g.parentCategoryId,
    name: g.name,
    maxPoints: g.maxPoints,
  }));

  const gradeEntries: GradeEntry[] = archive.gradeEntries.map((g) => ({
    id: g.id,
    courseId: g.courseId,
    categoryId: g.categoryId,
    label: g.label,
    scoreEarned: g.scoreEarned,
    scoreMax: g.scoreMax,
    recordedAt: g.recordedAt,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));

  const gradeBoundaries: GradeBoundary[] = archive.gradeBoundaries.map((g) => ({
    id: g.id,
    courseId: g.courseId,
    label: g.label,
    minPercent: g.minPercent,
  }));

  const practiceEntries: PracticeEntry[] = archive.practiceEntries.map((p) => ({
    id: p.id,
    unitId: p.unitId,
    courseId: p.courseId,
    label: p.label,
    scoreEarned: p.scoreEarned,
    scoreMax: p.scoreMax,
    recordedAt: p.recordedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  const weeklyCheckIns: WeeklyCheckIn[] = archive.weeklyCheckIns.map((w) => ({
    id: w.id,
    weekStartDate: w.weekStartDate,
    energy: w.energy,
    focus: w.focus,
    stress: w.stress,
    overallRating: w.overallRating,
    note: w.note,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));

  return {
    semester,
    tags,
    courses,
    units,
    contentBlocks,
    tasks,
    taskCompletionEvents,
    scheduleTemplates,
    scheduleOccurrences,
    gradeCategories,
    gradeEntries,
    gradeBoundaries,
    practiceEntries,
    weeklyCheckIns,
  };
}
