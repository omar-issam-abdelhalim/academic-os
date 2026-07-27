/**
 * Semester Export archive schema (PRODUCT_SPEC.md §16, DATA_MODEL.md
 * §"Archive Schema"). A versioned Zod envelope, validated both when the
 * app builds an export (self-check per SECURITY.md §10: "what we just
 * wrote parses and round-trips") and — in a future Stage 7 Import pass —
 * against untrusted input. Building/writing the archive itself happens in
 * `exportRepository`, which owns reading Dexie; this module is pure
 * schema + assembly so it stays unit-testable without a browser.
 *
 * Import is explicitly out of scope this pass (PRODUCT_SPEC.md §18 marks
 * it "future"); this schema exists now so export can self-validate and so
 * Import has a ready, already-proven contract to build against later.
 */
import { z } from "zod";

export const ARCHIVE_VERSION = 1;

const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const semesterSchema = z.object({
  id: z.string(),
  academicYear: z.string(),
  label: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const courseSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().optional(),
  instructor: z.string().optional(),
  description: z.string().optional(),
  tagIds: z.array(z.string()),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const unitSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  title: z.string(),
  type: z.string(),
  order: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Metadata only — no blob binary data, per PRODUCT_SPEC.md §16. */
const contentBlockMetadataSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  type: z.enum(["text", "file", "image", "video"]),
  title: z.string(),
  order: z.number(),
  content: z.string().optional(),
  originalFileName: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const taskSchema = z.object({
  id: z.string(),
  courseId: z.string().optional(),
  unitId: z.string().optional(),
  title: z.string(),
  dueDate: z.string().optional(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const taskCompletionEventSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  toggledTo: z.boolean(),
  at: z.string(),
});

const scheduleTemplateSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  type: z.string(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  instructor: z.string().optional(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const scheduleOccurrenceSchema = z.object({
  id: z.string(),
  scheduleTemplateId: z.string(),
  date: z.string(),
  status: z.enum(["attended", "missed", "cancelled", "unmarked"]),
  notes: z.string().optional(),
  courseId: z.string(),
  type: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const gradeCategorySchema = z.object({
  id: z.string(),
  courseId: z.string(),
  parentCategoryId: z.string().optional(),
  name: z.string(),
  maxPoints: z.number(),
});

const gradeEntrySchema = z.object({
  id: z.string(),
  courseId: z.string(),
  categoryId: z.string().optional(),
  label: z.string(),
  scoreEarned: z.number(),
  scoreMax: z.number(),
  recordedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const gradeBoundarySchema = z.object({
  id: z.string(),
  courseId: z.string(),
  label: z.string(),
  minPercent: z.number(),
});

const practiceEntrySchema = z.object({
  id: z.string(),
  unitId: z.string().optional(),
  courseId: z.string(),
  label: z.string(),
  scoreEarned: z.number(),
  scoreMax: z.number(),
  recordedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const weeklyCheckInSchema = z.object({
  id: z.string(),
  weekStartDate: z.string(),
  energy: z.number().optional(),
  focus: z.number().optional(),
  stress: z.number().optional(),
  overallRating: z.number().optional(),
  note: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const semesterArchiveSchema = z.object({
  archiveVersion: z.literal(ARCHIVE_VERSION),
  exportedAt: z.string(),
  appVersion: z.string(),
  semester: semesterSchema,
  tags: z.array(tagSchema),
  courses: z.array(courseSchema),
  units: z.array(unitSchema),
  contentBlockMetadata: z.array(contentBlockMetadataSchema),
  tasks: z.array(taskSchema),
  taskCompletionEvents: z.array(taskCompletionEventSchema),
  scheduleTemplates: z.array(scheduleTemplateSchema),
  scheduleOccurrences: z.array(scheduleOccurrenceSchema),
  gradeCategories: z.array(gradeCategorySchema),
  gradeEntries: z.array(gradeEntrySchema),
  gradeBoundaries: z.array(gradeBoundarySchema),
  practiceEntries: z.array(practiceEntrySchema),
  weeklyCheckIns: z.array(weeklyCheckInSchema),
});

export type SemesterArchive = z.infer<typeof semesterArchiveSchema>;

export class ArchiveValidationError extends Error {
  constructor(readonly issues: z.ZodIssue[]) {
    super("Semester archive failed schema validation.");
    this.name = "ArchiveValidationError";
  }
}

/** Parses and validates a candidate archive payload (untrusted or
 * self-produced) against the versioned schema — never trusts shape by
 * construction alone. */
export function parseSemesterArchive(data: unknown): SemesterArchive {
  const result = semesterArchiveSchema.safeParse(data);
  if (!result.success) {
    throw new ArchiveValidationError(result.error.issues);
  }
  return result.data;
}
