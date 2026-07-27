/**
 * Practice analytics (Stage 4). Structurally identical shape to grade
 * analytics but deliberately a separate module operating on
 * `PracticeEntry` — Practice and Grades are never combined into one number
 * anywhere in this app (PRODUCT_SPEC.md §12), including here.
 */
import { sumRecorded, currentPerformancePercent } from "@/domain/gradeSummary";
import { classifyTrend, type TrendPoint, type TrendResult } from "./trend";
import type { PracticeEntry } from "@/types/entities";

export interface PracticeMetrics {
  recordedEarned: number;
  recordedMax: number;
  /** undefined (never 0) when no practice has been recorded yet. */
  normalizedPercent: number | undefined;
  entryCount: number;
  trend: TrendResult;
  /** The same per-entry percentages `trend` was classified from, sorted
   * chronologically, so the UI can chart the real series. */
  series: TrendPoint[];
}

export function computePracticeMetrics(entries: PracticeEntry[]): PracticeMetrics {
  const totals = sumRecorded(entries);
  const normalizedPercent = currentPerformancePercent(totals);

  const series: TrendPoint[] = entries
    .filter((e) => e.scoreMax > 0)
    .map((e) => ({ at: e.recordedAt, value: (e.scoreEarned / e.scoreMax) * 100 }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return {
    recordedEarned: totals.earned,
    recordedMax: totals.max,
    normalizedPercent,
    entryCount: entries.length,
    trend: classifyTrend(series),
    series,
  };
}

export function computePracticeMetricsByCourse(
  entries: PracticeEntry[],
  courseId: string,
): PracticeMetrics {
  return computePracticeMetrics(entries.filter((e) => e.courseId === courseId));
}
