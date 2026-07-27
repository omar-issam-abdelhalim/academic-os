/**
 * Semester-wide analytics (Stage 4). Every semester-wide rate here is a
 * ratio of sums (total completed / total relevant, total attended /
 * total attended+missed, total points earned / total points recorded) —
 * never a naive average of each course's own percentage. Averaging
 * percentages directly would silently misweight a course with 2 tasks the
 * same as one with 40; summing the raw numerators/denominators first is
 * the mathematically valid way to combine them.
 */
import { computeTaskMetrics } from "./taskAnalytics";
import { computeAttendanceMetrics } from "./attendanceAnalytics";
import { computeGradeMetrics } from "./gradeAnalytics";
import { computePracticeMetrics } from "./practiceAnalytics";
import {
  computeCourseAnalytics,
  type AnalyticsSourceData,
  type CourseAnalyticsProfile,
} from "./courseAnalytics";
import type { TaskMetrics } from "./taskAnalytics";
import type { AttendanceMetrics } from "./attendanceAnalytics";
import type { GradeMetrics } from "./gradeAnalytics";
import type { PracticeMetrics } from "./practiceAnalytics";

export interface SemesterAnalytics {
  tasks: TaskMetrics;
  attendance: AttendanceMetrics;
  grades: GradeMetrics;
  practice: PracticeMetrics;
  courses: CourseAnalyticsProfile[];
}

export function computeSemesterAnalytics(input: AnalyticsSourceData): SemesterAnalytics {
  const now = input.now ?? new Date();
  return {
    tasks: computeTaskMetrics(input.tasks, input.taskCompletionEvents, now),
    attendance: computeAttendanceMetrics(input.occurrences),
    grades: computeGradeMetrics(input.gradeEntries),
    practice: computePracticeMetrics(input.practiceEntries),
    courses: computeCourseAnalytics(input),
  };
}

export type { AnalyticsSourceData, CourseAnalyticsProfile };
