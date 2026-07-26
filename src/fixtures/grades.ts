/** Reference-UI fixture data only — never written to Dexie.
 *
 * CSAI 101 demonstrates Structured Mode with a deliberately incomplete
 * category (Midterm has zero entries, Project is partially recorded) to
 * show "N pts not yet allocated"/"remaining" states honestly rather than
 * as zero (PRODUCT_SPEC.md §10-11). Mathematics II demonstrates Simple
 * Mode with the exact example from PRODUCT_SPEC.md §10 (Quiz 1: 3/5,
 * Quiz 2: 5/5 → 8/10 recorded). Git & GitHub / ML have no grade data —
 * demonstrating the "no grades yet" empty state for non-university,
 * self-study courses.
 */
import type { GradeCategory, GradeEntry, GradeBoundary, PracticeEntry } from "@/types/entities";

export const fixtureGradeCategories: GradeCategory[] = [
  { id: "cat-coursework", courseId: "course-csai101", name: "Coursework", maxPoints: 60 },
  {
    id: "cat-quizzes",
    courseId: "course-csai101",
    parentCategoryId: "cat-coursework",
    name: "Quizzes",
    maxPoints: 10,
  },
  {
    id: "cat-assignments",
    courseId: "course-csai101",
    parentCategoryId: "cat-coursework",
    name: "Assignments",
    maxPoints: 10,
  },
  {
    id: "cat-midterm",
    courseId: "course-csai101",
    parentCategoryId: "cat-coursework",
    name: "Midterm",
    maxPoints: 20,
  },
  {
    id: "cat-project",
    courseId: "course-csai101",
    parentCategoryId: "cat-coursework",
    name: "Project",
    maxPoints: 20,
  },
  { id: "cat-final", courseId: "course-csai101", name: "Final", maxPoints: 40 },
];

export const fixtureGradeEntries: GradeEntry[] = [
  {
    id: "ge-1",
    courseId: "course-csai101",
    categoryId: "cat-quizzes",
    label: "Quiz 1",
    scoreEarned: 3,
    scoreMax: 5,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "ge-2",
    courseId: "course-csai101",
    categoryId: "cat-quizzes",
    label: "Quiz 2",
    scoreEarned: 4,
    scoreMax: 5,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "ge-3",
    courseId: "course-csai101",
    categoryId: "cat-assignments",
    label: "Assignment 1",
    scoreEarned: 8,
    scoreMax: 10,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "ge-4",
    courseId: "course-csai101",
    categoryId: "cat-project",
    label: "Project Milestone 1",
    scoreEarned: 15,
    scoreMax: 20,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  // Simple Mode: course-math2 has no categories at all — entries are
  // unassigned (categoryId omitted), matching PRODUCT_SPEC.md §10 exactly.
  {
    id: "ge-5",
    courseId: "course-math2",
    label: "Quiz 1",
    scoreEarned: 3,
    scoreMax: 5,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "ge-6",
    courseId: "course-math2",
    label: "Quiz 2",
    scoreEarned: 5,
    scoreMax: 5,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
];

export const fixtureGradeBoundaries: GradeBoundary[] = [
  { id: "gb-1", courseId: "course-csai101", label: "A+", minPercent: 90 },
  { id: "gb-2", courseId: "course-csai101", label: "A", minPercent: 85 },
  { id: "gb-3", courseId: "course-csai101", label: "B+", minPercent: 80 },
  { id: "gb-4", courseId: "course-csai101", label: "B", minPercent: 75 },
  { id: "gb-5", courseId: "course-csai101", label: "C+", minPercent: 70 },
  { id: "gb-6", courseId: "course-csai101", label: "Pass", minPercent: 60 },
];

export const fixturePracticeEntries: PracticeEntry[] = [
  {
    id: "pe-1",
    unitId: "unit-csai-t3",
    courseId: "course-csai101",
    label: "Tutorial Practice",
    scoreEarned: 7,
    scoreMax: 10,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "pe-2",
    unitId: "unit-csai-t3",
    courseId: "course-csai101",
    label: "Backprop Quiz",
    scoreEarned: 8,
    scoreMax: 10,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "pe-3",
    unitId: "unit-csai-l3",
    courseId: "course-csai101",
    label: "Lecture Questions",
    scoreEarned: 14,
    scoreMax: 20,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "pe-4",
    unitId: "unit-math-c5",
    courseId: "course-math2",
    label: "Self-rating",
    scoreEarned: 7,
    scoreMax: 10,
    recordedAt: "",
    createdAt: "",
    updatedAt: "",
  },
];
