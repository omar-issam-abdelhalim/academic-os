/**
 * Conceptual entity types transcribed from docs/DATA_MODEL.md.
 *
 * These are the *persistence-record* shapes (what Dexie stores). UI view
 * models built from fixtures for reference screens (src/fixtures/) are
 * intentionally kept as separate, UI-shaped types rather than importing
 * these directly everywhere — see ARCHITECTURE.md §"TypeScript Quality":
 * "do not couple every UI component directly to Dexie records."
 */

export interface AppPreferences {
  id: "singleton";
  theme: "system" | "light" | "dark";
  hasCompletedOnboarding: boolean;
  notificationsEnabled: boolean;
  lastExportReminderAt?: string;
}

/** Global, persistent — lives in the preferences database (DATA_MODEL.md §Tag). */
export interface Tag {
  id: string;
  name: string;
  /** One of the 9 curated hues — see src/styles/tokens.css tag/* tokens. */
  color: TagColor;
  createdAt: string;
  updatedAt: string;
}

export type TagColor =
  "slate" | "sage" | "clay" | "amber" | "plum" | "teal" | "rose" | "olive" | "stone";

export interface Semester {
  id: string;
  academicYear: string;
  label: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  instructor?: string;
  description?: string;
  tagIds: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type UnitType =
  | "Lecture"
  | "Tutorial"
  | "Section"
  | "Lab"
  | "Video"
  | "Chapter"
  | "Assignment"
  | "Workshop"
  | (string & {});

export interface Unit {
  id: string;
  courseId: string;
  title: string;
  type: UnitType;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ContentBlock =
  | (ContentBlockBase & { type: "text"; content: string })
  | (ContentBlockBase & {
      type: "file" | "image" | "video";
      blobId: string;
      originalFileName: string;
      mimeType: string;
      sizeBytes: number;
    });

interface ContentBlockBase {
  id: string;
  unitId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/** Dedicated table, deliberately separate from ContentBlock metadata
 * (DATA_MODEL.md §Blob) — kept apart so metadata-only queries (rendering a
 * unit's block list) never pull binary payloads into memory. */
export interface StoredBlob {
  id: string;
  mimeType: string;
  sizeBytes: number;
  data: Blob;
  createdAt: string;
}

export interface Task {
  id: string;
  courseId?: string;
  unitId?: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletionEvent {
  id: string;
  taskId: string;
  toggledTo: boolean;
  at: string;
}

export type ScheduleEventType = "Lecture" | "Tutorial" | "Section" | "Lab" | (string & {});

export interface ScheduleTemplate {
  id: string;
  courseId: string;
  type: ScheduleEventType;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Saturday .. 6 = Friday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  location?: string;
  instructor?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleOccurrenceStatus = "attended" | "missed" | "cancelled" | "unmarked";

export interface ScheduleOccurrence {
  id: string;
  scheduleTemplateId: string;
  date: string; // "YYYY-MM-DD"
  status: ScheduleOccurrenceStatus;
  notes?: string;
  // Denormalized snapshot — see DATA_MODEL.md §"ScheduleTemplate vs. ScheduleOccurrence"
  courseId: string;
  type: ScheduleEventType;
  startTime: string;
  endTime: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeCategory {
  id: string;
  courseId: string;
  parentCategoryId?: string;
  name: string;
  maxPoints: number;
}

export interface GradeEntry {
  id: string;
  courseId: string;
  categoryId?: string;
  label: string;
  scoreEarned: number;
  scoreMax: number;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GradeBoundary {
  id: string;
  courseId: string;
  label: string;
  minPercent: number;
}

export interface PracticeEntry {
  id: string;
  unitId?: string;
  courseId: string;
  label: string;
  scoreEarned: number;
  scoreMax: number;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyCheckIn {
  id: string;
  weekStartDate: string;
  energy?: number;
  focus?: number;
  stress?: number;
  overallRating?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
