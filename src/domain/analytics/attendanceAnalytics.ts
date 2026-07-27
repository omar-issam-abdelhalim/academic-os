/**
 * Attendance analytics (Stage 4). The attendance-rate denominator is
 * `attended + missed` only — `cancelled` and `unmarked` are excluded,
 * matching PRODUCT_SPEC.md §8/Cross-Cutting Invariant #6 exactly (a
 * cancelled session must never count negatively). The weekly trend applies
 * the same exclusion per bucket, so a week full of cancellations never
 * drags the trend down.
 */
import { getAcademicWeek } from "@/domain/academicWeek";
import { classifyTrend, type TrendPoint, type TrendResult } from "./trend";
import type { ScheduleOccurrence } from "@/types/entities";

export interface AttendanceMetrics {
  attended: number;
  missed: number;
  cancelled: number;
  unmarked: number;
  /** undefined when attended+missed is 0 — no recorded sessions to rate yet. */
  attendanceRate: number | undefined;
  trend: TrendResult;
  /** Weekly attendance-rate points, chronologically sorted — the same
   * points `trend` was classified from, exposed so the UI can chart the
   * real series rather than just the classification. */
  weeklyRates: TrendPoint[];
}

function rateFor(occurrences: ScheduleOccurrence[]): number | undefined {
  const attended = occurrences.filter((o) => o.status === "attended").length;
  const missed = occurrences.filter((o) => o.status === "missed").length;
  const denominator = attended + missed;
  return denominator > 0 ? (attended / denominator) * 100 : undefined;
}

export function computeAttendanceMetrics(occurrences: ScheduleOccurrence[]): AttendanceMetrics {
  const attended = occurrences.filter((o) => o.status === "attended").length;
  const missed = occurrences.filter((o) => o.status === "missed").length;
  const cancelled = occurrences.filter((o) => o.status === "cancelled").length;
  const unmarked = occurrences.filter((o) => o.status === "unmarked").length;
  const attendanceRate = rateFor(occurrences);

  const byWeek = new Map<string, ScheduleOccurrence[]>();
  for (const occurrence of occurrences) {
    if (occurrence.status !== "attended" && occurrence.status !== "missed") continue;
    const week = getAcademicWeek(new Date(occurrence.date));
    const key = week.start.toISOString();
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(occurrence);
  }
  const points: TrendPoint[] = [];
  for (const [weekStart, weekOccurrences] of byWeek) {
    const rate = rateFor(weekOccurrences);
    if (rate !== undefined) points.push({ at: weekStart, value: rate });
  }
  const weeklyRates = points.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return {
    attended,
    missed,
    cancelled,
    unmarked,
    attendanceRate,
    trend: classifyTrend(points),
    weeklyRates,
  };
}

export function computeAttendanceMetricsByCourse(
  occurrences: ScheduleOccurrence[],
  courseId: string,
): AttendanceMetrics {
  return computeAttendanceMetrics(occurrences.filter((o) => o.courseId === courseId));
}
