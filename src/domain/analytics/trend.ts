/**
 * Deterministic trend classification (Stage 4). This never predicts the
 * future — it only classifies a change that has *already been observed*
 * between an earlier and a later slice of a chronological series, in the
 * same correlation-not-causation spirit PRODUCT_SPEC.md §13 requires of
 * all analytics: describing a pattern in the user's own data, not making
 * a claim about what will happen next.
 *
 * Method: split the chronologically-sorted series into two halves and
 * compare their averages. This is a simple, auditable rule — not a
 * statistical model — deliberately, so every classification the app shows
 * a student can be explained in one sentence.
 */
export type Trend = "improving" | "declining" | "stable" | "insufficient-data";

export interface TrendPoint {
  /** ISO date string or Date — the moment this data point was recorded. */
  at: Date | string;
  value: number;
}

/** Fewer than this many chronologically distinct points is not enough
 * evidence to claim any trend — "insufficient-data" is returned instead of
 * guessing from noise. */
export const MIN_POINTS_FOR_TREND = 4;

/** A first-half-to-second-half average change smaller than this (in the
 * same unit as `value`, typically percentage points) is treated as normal
 * variation, not a real trend. */
export const STABLE_THRESHOLD = 5;

export interface TrendResult {
  trend: Trend;
  /** secondHalfAverage − firstHalfAverage. Undefined when insufficient-data. */
  delta?: number;
  firstHalfAverage?: number;
  secondHalfAverage?: number;
  pointCount: number;
}

function toTime(at: Date | string): number {
  return typeof at === "string" ? new Date(at).getTime() : at.getTime();
}

function average(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function classifyTrend(points: TrendPoint[]): TrendResult {
  if (points.length < MIN_POINTS_FOR_TREND) {
    return { trend: "insufficient-data", pointCount: points.length };
  }

  const sorted = [...points].sort((a, b) => toTime(a.at) - toTime(b.at));
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const firstHalfAverage = average(firstHalf.map((p) => p.value));
  const secondHalfAverage = average(secondHalf.map((p) => p.value));
  const delta = secondHalfAverage - firstHalfAverage;

  let trend: Trend;
  if (delta >= STABLE_THRESHOLD) trend = "improving";
  else if (delta <= -STABLE_THRESHOLD) trend = "declining";
  else trend = "stable";

  return { trend, delta, firstHalfAverage, secondHalfAverage, pointCount: sorted.length };
}
