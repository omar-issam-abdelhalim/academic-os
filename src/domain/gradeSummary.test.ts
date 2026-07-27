import { describe, expect, it } from "vitest";
import {
  sumRecorded,
  summarizeCategory,
  topLevelCategories,
  childCategories,
  currentPerformancePercent,
  remainingAvailablePoints,
  maxPossibleFinalScore,
  requiredScoreForTarget,
  boundaryForPercent,
} from "./gradeSummary";
import type { GradeBoundary, GradeCategory, GradeEntry } from "@/types/entities";

describe("sumRecorded", () => {
  it("sums earned/max across entries", () => {
    const entries: GradeEntry[] = [
      {
        id: "1",
        courseId: "c",
        label: "Quiz 1",
        scoreEarned: 3,
        scoreMax: 5,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        courseId: "c",
        label: "Quiz 2",
        scoreEarned: 5,
        scoreMax: 5,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    expect(sumRecorded(entries)).toEqual({ earned: 8, max: 10 });
  });

  it("never returns anything for an empty list other than a zero total — never treated as a real score", () => {
    expect(sumRecorded([])).toEqual({ earned: 0, max: 0 });
  });
});

describe("summarizeCategory", () => {
  const category: GradeCategory = { id: "cat-1", courseId: "c", name: "Quizzes", maxPoints: 10 };

  it("reports unallocated points honestly rather than as a recorded zero", () => {
    const entries: GradeEntry[] = [
      {
        id: "1",
        courseId: "c",
        categoryId: "cat-1",
        label: "Quiz 1",
        scoreEarned: 3,
        scoreMax: 5,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const summary = summarizeCategory(category, entries);
    expect(summary.recorded).toEqual({ earned: 3, max: 5 });
    expect(summary.unallocated).toBe(5);
  });

  it("only counts entries actually assigned to this category", () => {
    const entries: GradeEntry[] = [
      {
        id: "1",
        courseId: "c",
        categoryId: "cat-1",
        label: "Quiz 1",
        scoreEarned: 3,
        scoreMax: 5,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "2",
        courseId: "c",
        categoryId: "cat-2",
        label: "Other",
        scoreEarned: 10,
        scoreMax: 10,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "3",
        courseId: "c",
        label: "Unassigned",
        scoreEarned: 1,
        scoreMax: 1,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    const summary = summarizeCategory(category, entries);
    expect(summary.recorded).toEqual({ earned: 3, max: 5 });
  });

  it("never reports negative unallocated points if entries exceed the declared max", () => {
    const entries: GradeEntry[] = [
      {
        id: "1",
        courseId: "c",
        categoryId: "cat-1",
        label: "Extra credit",
        scoreEarned: 12,
        scoreMax: 12,
        recordedAt: "",
        createdAt: "",
        updatedAt: "",
      },
    ];
    expect(summarizeCategory(category, entries).unallocated).toBe(0);
  });
});

describe("topLevelCategories / childCategories", () => {
  const categories: GradeCategory[] = [
    { id: "coursework", courseId: "c", name: "Coursework", maxPoints: 60 },
    {
      id: "quizzes",
      courseId: "c",
      parentCategoryId: "coursework",
      name: "Quizzes",
      maxPoints: 10,
    },
    { id: "final", courseId: "c", name: "Final", maxPoints: 40 },
  ];

  it("separates top-level from nested categories", () => {
    expect(topLevelCategories(categories).map((c) => c.id)).toEqual(["coursework", "final"]);
    expect(childCategories(categories, "coursework").map((c) => c.id)).toEqual(["quizzes"]);
  });
});

describe("currentPerformancePercent", () => {
  it("is undefined (not zero) when nothing has been recorded yet", () => {
    expect(currentPerformancePercent({ earned: 0, max: 0 })).toBeUndefined();
  });

  it("computes a percentage only over what's recorded, never the course's full declared total", () => {
    expect(currentPerformancePercent({ earned: 8, max: 10 })).toBe(80);
  });
});

describe("remainingAvailablePoints / maxPossibleFinalScore", () => {
  it("computes remaining points against a declared course maximum", () => {
    expect(remainingAvailablePoints(100, { earned: 40, max: 60 })).toBe(40);
  });

  it("never goes negative if recorded max exceeds the declared course maximum", () => {
    expect(remainingAvailablePoints(50, { earned: 40, max: 60 })).toBe(0);
  });

  it("max possible final is everything earned plus a perfect score on the remainder", () => {
    const recorded = { earned: 40, max: 60 };
    const remaining = remainingAvailablePoints(100, recorded);
    expect(maxPossibleFinalScore(recorded, remaining)).toBe(80);
  });
});

describe("requiredScoreForTarget", () => {
  it("returns the additional points needed on the remainder to reach a target percent", () => {
    const recorded = { earned: 40, max: 60 };
    const remaining = remainingAvailablePoints(100, recorded); // 40
    // Target 70% of 100 = 70 points total; 40 already earned -> 30 more needed.
    expect(requiredScoreForTarget(100, recorded, remaining, 70)).toBe(30);
  });

  it("is undefined when there's no remaining capacity left to earn it in", () => {
    const recorded = { earned: 90, max: 100 };
    expect(requiredScoreForTarget(100, recorded, 0, 95)).toBeUndefined();
  });

  it("never exceeds the remaining points available, and never goes negative", () => {
    const recorded = { earned: 10, max: 20 };
    const remaining = remainingAvailablePoints(100, recorded); // 80
    expect(requiredScoreForTarget(100, recorded, remaining, 100)).toBe(80);
    expect(requiredScoreForTarget(100, recorded, remaining, 5)).toBe(0);
  });
});

describe("boundaryForPercent", () => {
  const boundaries: GradeBoundary[] = [
    { id: "b1", courseId: "c", label: "A+", minPercent: 90 },
    { id: "b2", courseId: "c", label: "A", minPercent: 85 },
    { id: "b3", courseId: "c", label: "B+", minPercent: 80 },
  ];

  it("returns the highest boundary the percent clears", () => {
    expect(boundaryForPercent(boundaries, 87)?.label).toBe("A");
    expect(boundaryForPercent(boundaries, 91)?.label).toBe("A+");
  });

  it("is undefined when no boundary is cleared", () => {
    expect(boundaryForPercent(boundaries, 50)).toBeUndefined();
  });
});
