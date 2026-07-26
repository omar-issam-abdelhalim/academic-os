import { describe, expect, it } from "vitest";
import {
  sumRecorded,
  summarizeCategory,
  topLevelCategories,
  childCategories,
} from "./gradeSummary";
import type { GradeCategory, GradeEntry } from "@/types/entities";

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
