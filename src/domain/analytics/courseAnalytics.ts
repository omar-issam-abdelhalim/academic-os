/**
 * Per-course analytics profile (Stage 4). Deliberately a multi-dimensional
 * profile, never a single blended "course score" — this stage's own rule:
 * inventing weights like 40% grades / 20% attendance / 20% tasks / 20%
 * practice would be arbitrary and would misleadingly imply an official
 * academic judgment. Task completion, attendance, grades, and practice
 * stay semantically separate dimensions a student reads independently.
 */
import { computeTaskMetricsByCourse, type TaskMetrics } from "./taskAnalytics";
import { computeAttendanceMetricsByCourse, type AttendanceMetrics } from "./attendanceAnalytics";
import { computeGradeMetricsByCourse, type GradeMetrics } from "./gradeAnalytics";
import { computePracticeMetricsByCourse, type PracticeMetrics } from "./practiceAnalytics";
import type {
  Course,
  GradeEntry,
  PracticeEntry,
  ScheduleOccurrence,
  Task,
  TaskCompletionEvent,
} from "@/types/entities";

export interface CourseAnalyticsProfile {
  course: Course;
  tasks: TaskMetrics;
  attendance: AttendanceMetrics;
  grades: GradeMetrics;
  practice: PracticeMetrics;
}

export interface AnalyticsSourceData {
  courses: Course[];
  tasks: Task[];
  taskCompletionEvents: TaskCompletionEvent[];
  occurrences: ScheduleOccurrence[];
  gradeEntries: GradeEntry[];
  practiceEntries: PracticeEntry[];
  now?: Date;
}

export function computeCourseAnalytics(input: AnalyticsSourceData): CourseAnalyticsProfile[] {
  const now = input.now ?? new Date();
  return input.courses.map((course) => ({
    course,
    tasks: computeTaskMetricsByCourse(input.tasks, input.taskCompletionEvents, course.id, now),
    attendance: computeAttendanceMetricsByCourse(input.occurrences, course.id),
    grades: computeGradeMetricsByCourse(input.gradeEntries, course.id),
    practice: computePracticeMetricsByCourse(input.practiceEntries, course.id),
  }));
}
