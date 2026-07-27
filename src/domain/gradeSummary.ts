/**
 * Grade-aggregation domain logic for both Simple and Structured Mode
 * (PRODUCT_SPEC.md §10-11). Deliberately conservative about what it
 * fabricates: an unrecorded entry/category is never treated as a zero, and
 * "current performance" is always computed only over what's actually been
 * recorded, never over declared-but-empty category capacity.
 */
import type { GradeBoundary, GradeCategory, GradeEntry } from "@/types/entities";

export interface RecordedTotal {
  earned: number;
  max: number;
}

/** Sums earned/max across entries — used for both Simple Mode's flat total
 * and a single category's recorded total. */
export function sumRecorded(entries: GradeEntry[]): RecordedTotal {
  return entries.reduce(
    (acc, e) => ({ earned: acc.earned + e.scoreEarned, max: acc.max + e.scoreMax }),
    { earned: 0, max: 0 },
  );
}

export interface CategorySummary {
  category: GradeCategory;
  recorded: RecordedTotal;
  /** Points in this category's declared max that no entry accounts for
   * yet — never rendered as zero, always as "not yet allocated." */
  unallocated: number;
}

export function summarizeCategory(category: GradeCategory, entries: GradeEntry[]): CategorySummary {
  const own = entries.filter((e) => e.categoryId === category.id);
  const recorded = sumRecorded(own);
  return { category, recorded, unallocated: Math.max(category.maxPoints - recorded.max, 0) };
}

/** Top-level categories only (no parentCategoryId) — used to build the
 * course-total "N pts not yet allocated" line described in
 * STAGE_1A_UX_ARCHITECTURE.md §L. */
export function topLevelCategories(categories: GradeCategory[]): GradeCategory[] {
  return categories.filter((c) => !c.parentCategoryId);
}

export function childCategories(categories: GradeCategory[], parentId: string): GradeCategory[] {
  return categories.filter((c) => c.parentCategoryId === parentId);
}

/** "Current performance" — a percentage computed only over what's actually
 * recorded (`recorded.max`), never over a course's full declared point
 * total. `undefined` (not `0`) when nothing has been recorded yet, so the
 * UI can render "not yet available" instead of a misleading 0%. */
export function currentPerformancePercent(recorded: RecordedTotal): number | undefined {
  if (recorded.max <= 0) return undefined;
  return (recorded.earned / recorded.max) * 100;
}

/** Points still available to be recorded: a course's full declared maximum
 * (Structured Mode's category tree total) minus what's already been given
 * a category. In Simple Mode (no declared course total), this is always 0
 * — there's no "remaining" concept without a declared ceiling. */
export function remainingAvailablePoints(courseMaxPoints: number, recorded: RecordedTotal): number {
  return Math.max(courseMaxPoints - recorded.max, 0);
}

/** The best final score still achievable: everything earned so far, plus a
 * perfect score on every remaining (not-yet-recorded) point. */
export function maxPossibleFinalScore(recorded: RecordedTotal, remaining: number): number {
  return recorded.earned + remaining;
}

/** Score still needed on the remaining points to reach a target overall
 * percentage of `courseMaxPoints` — `undefined` if there's no remaining
 * capacity left to earn it in (target is already unreachable or already
 * decided). Never negative: if the target is already met, 0 remaining
 * points are required. */
export function requiredScoreForTarget(
  courseMaxPoints: number,
  recorded: RecordedTotal,
  remaining: number,
  targetPercent: number,
): number | undefined {
  if (remaining <= 0) return undefined;
  const targetPoints = (targetPercent / 100) * courseMaxPoints;
  const needed = targetPoints - recorded.earned;
  return Math.min(Math.max(needed, 0), remaining);
}

/** Highest boundary (e.g. "A+") whose `minPercent` the given percent
 * clears — grade boundaries are always user-configurable per course, never
 * a hard-coded scale (PRODUCT_SPEC.md §11). */
export function boundaryForPercent(
  boundaries: GradeBoundary[],
  percent: number,
): GradeBoundary | undefined {
  return [...boundaries]
    .sort((a, b) => b.minPercent - a.minPercent)
    .find((b) => percent >= b.minPercent);
}
