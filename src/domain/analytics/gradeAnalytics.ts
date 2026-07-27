/**
 * Grade analytics (Stage 4). Reuses `gradeSummary.ts`'s existing,
 * already-approved aggregation (`sumRecorded`/`currentPerformancePercent`)
 * rather than recomputing recorded totals a second way — one authoritative
 * definition per metric, per this stage's own requirement. Works
 * identically for Simple Mode (flat, uncategorized entries) and Structured
 * Mode (categorized entries): both are just "GradeEntry rows," so this
 * layer never needs to know which mode a course is in.
 */
import { sumRecorded, currentPerformancePercent } from "@/domain/gradeSummary";
import { classifyTrend, type TrendPoint, type TrendResult } from "./trend";
import type { GradeEntry } from "@/types/entities";

export interface GradeMetrics {
  recordedEarned: number;
  recordedMax: number;
  /** undefined (never 0) when nothing has been recorded yet. */
  performancePercent: number | undefined;
  entryCount: number;
  /** "Recent grade direction" — each entry's own earned/max percentage,
   * ordered by `recordedAt`, split into an earlier and later half. Never
   * mixes a course's total declared points with individual entry percents
   * — each point is a percentage of its own denominator, so combining them
   * never divides by an incompatible total. */
  trend: TrendResult;
  /** The same per-entry percentages `trend` was classified from, sorted
   * chronologically, so the UI can chart the real series. */
  series: TrendPoint[];
}

export function computeGradeMetrics(entries: GradeEntry[]): GradeMetrics {
  const totals = sumRecorded(entries);
  const performancePercent = currentPerformancePercent(totals);

  const series: TrendPoint[] = entries
    .filter((e) => e.scoreMax > 0)
    .map((e) => ({ at: e.recordedAt, value: (e.scoreEarned / e.scoreMax) * 100 }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return {
    recordedEarned: totals.earned,
    recordedMax: totals.max,
    performancePercent,
    entryCount: entries.length,
    trend: classifyTrend(series),
    series,
  };
}

export function computeGradeMetricsByCourse(entries: GradeEntry[], courseId: string): GradeMetrics {
  return computeGradeMetrics(entries.filter((e) => e.courseId === courseId));
}
