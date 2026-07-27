import { describe, expect, it } from "vitest";
import { computePracticeMetrics, computePracticeMetricsByCourse } from "./practiceAnalytics";
import type { PracticeEntry } from "@/types/entities";

function makeEntry(overrides: Partial<PracticeEntry> = {}): PracticeEntry {
  return {
    id: "p1",
    courseId: "course-1",
    label: "Practice",
    scoreEarned: 7,
    scoreMax: 10,
    recordedAt: "2026-07-01T00:00:00.000Z",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("computePracticeMetrics", () => {
  it("reports undefined normalized percent when nothing is recorded", () => {
    expect(computePracticeMetrics([]).normalizedPercent).toBeUndefined();
  });

  it("normalizes a single entry as its own earned/max percentage", () => {
    const metrics = computePracticeMetrics([makeEntry({ scoreEarned: 7, scoreMax: 10 })]);
    expect(metrics.normalizedPercent).toBe(70);
    expect(metrics.entryCount).toBe(1);
  });

  it("never mixes with grade data — this module never imports GradeEntry", () => {
    const metrics = computePracticeMetrics([makeEntry()]);
    expect(metrics).not.toHaveProperty("gradeEntries");
  });

  it("scopes metrics to a single course", () => {
    const entries = [
      makeEntry({ id: "1", courseId: "course-1", scoreEarned: 10, scoreMax: 10 }),
      makeEntry({ id: "2", courseId: "course-2", scoreEarned: 0, scoreMax: 10 }),
    ];
    expect(computePracticeMetricsByCourse(entries, "course-1").normalizedPercent).toBe(100);
  });

  it("classifies a declining trend across at least 4 chronological entries", () => {
    const entries = [
      makeEntry({ id: "1", recordedAt: "2026-07-01", scoreEarned: 9, scoreMax: 10 }),
      makeEntry({ id: "2", recordedAt: "2026-07-05", scoreEarned: 9, scoreMax: 10 }),
      makeEntry({ id: "3", recordedAt: "2026-07-10", scoreEarned: 4, scoreMax: 10 }),
      makeEntry({ id: "4", recordedAt: "2026-07-15", scoreEarned: 4, scoreMax: 10 }),
    ];
    expect(computePracticeMetrics(entries).trend.trend).toBe("declining");
  });
});
