import { describe, expect, it } from "vitest";
import { computeGradeMetrics, computeGradeMetricsByCourse } from "./gradeAnalytics";
import type { GradeEntry } from "@/types/entities";

function makeEntry(overrides: Partial<GradeEntry> = {}): GradeEntry {
  return {
    id: "e1",
    courseId: "course-1",
    label: "Quiz",
    scoreEarned: 8,
    scoreMax: 10,
    recordedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("computeGradeMetrics", () => {
  it("reports undefined performance percent when nothing is recorded — never a fabricated 0%", () => {
    const metrics = computeGradeMetrics([]);
    expect(metrics.performancePercent).toBeUndefined();
    expect(metrics.entryCount).toBe(0);
  });

  it("works identically for Simple Mode entries (no category) and Structured Mode entries", () => {
    const simple = [makeEntry({ id: "1", categoryId: undefined, scoreEarned: 8, scoreMax: 10 })];
    const structured = [makeEntry({ id: "2", categoryId: "cat-1", scoreEarned: 8, scoreMax: 10 })];
    expect(computeGradeMetrics(simple).performancePercent).toBe(80);
    expect(computeGradeMetrics(structured).performancePercent).toBe(80);
  });

  it("sums earned/max as a ratio of sums, not an average of each entry's percentage", () => {
    const entries = [
      makeEntry({ id: "1", scoreEarned: 9, scoreMax: 10 }), // 90%
      makeEntry({ id: "2", scoreEarned: 40, scoreMax: 100 }), // 40%
    ];
    // Ratio of sums: 49/110 ≈ 44.5%, not the naive average (65%).
    const metrics = computeGradeMetrics(entries);
    expect(metrics.performancePercent).toBeCloseTo((49 / 110) * 100, 5);
  });

  it("classifies a per-entry improving trend from at least 4 chronologically-ordered entries", () => {
    const entries = [
      makeEntry({ id: "1", recordedAt: "2026-07-01", scoreEarned: 5, scoreMax: 10 }),
      makeEntry({ id: "2", recordedAt: "2026-07-05", scoreEarned: 5, scoreMax: 10 }),
      makeEntry({ id: "3", recordedAt: "2026-07-10", scoreEarned: 9, scoreMax: 10 }),
      makeEntry({ id: "4", recordedAt: "2026-07-15", scoreEarned: 9, scoreMax: 10 }),
    ];
    expect(computeGradeMetrics(entries).trend.trend).toBe("improving");
  });

  it("scopes metrics to a single course", () => {
    const entries = [
      makeEntry({ id: "1", courseId: "course-1", scoreEarned: 10, scoreMax: 10 }),
      makeEntry({ id: "2", courseId: "course-2", scoreEarned: 0, scoreMax: 10 }),
    ];
    expect(computeGradeMetricsByCourse(entries, "course-1").performancePercent).toBe(100);
  });
});
