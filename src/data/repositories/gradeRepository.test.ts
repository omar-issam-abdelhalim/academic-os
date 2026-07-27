import { describe, expect, it, beforeEach } from "vitest";
import { semesterDb } from "@/data/db";
import { createCourse } from "./courseRepository";
import {
  createCategory,
  createGradeEntry,
  deleteCategory,
  listCategoriesForCourse,
  listEntriesForCourse,
} from "./gradeRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

describe("gradeRepository", () => {
  it("creates a category and lists it for the course", async () => {
    const course = await createCourse({ name: "Course" });
    await createCategory({ courseId: course.id, name: "Coursework", maxPoints: 60 });
    expect((await listCategoriesForCourse(course.id)).map((c) => c.name)).toEqual(["Coursework"]);
  });

  it("supports one level of nesting via parentCategoryId", async () => {
    const course = await createCourse({ name: "Course" });
    const parent = await createCategory({ courseId: course.id, name: "Coursework", maxPoints: 60 });
    const child = await createCategory({
      courseId: course.id,
      name: "Quizzes",
      maxPoints: 10,
      parentCategoryId: parent.id,
    });
    expect(child.parentCategoryId).toBe(parent.id);
  });

  it("deleting a category unassigns (never deletes) entries that referenced it", async () => {
    const course = await createCourse({ name: "Course" });
    const category = await createCategory({
      courseId: course.id,
      name: "Coursework",
      maxPoints: 60,
    });
    const entry = await createGradeEntry({
      courseId: course.id,
      categoryId: category.id,
      label: "Quiz 1",
      scoreEarned: 4,
      scoreMax: 5,
    });

    await deleteCategory(category.id);

    expect(await semesterDb.gradeCategories.get(category.id)).toBeUndefined();
    const entries = await listEntriesForCourse(course.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe(entry.id);
    expect(entries[0]?.categoryId).toBeUndefined();
  });

  it("deleting a parent category un-nests (never deletes) its children", async () => {
    const course = await createCourse({ name: "Course" });
    const parent = await createCategory({ courseId: course.id, name: "Coursework", maxPoints: 60 });
    const child = await createCategory({
      courseId: course.id,
      name: "Quizzes",
      maxPoints: 10,
      parentCategoryId: parent.id,
    });

    await deleteCategory(parent.id);

    const reloadedChild = await semesterDb.gradeCategories.get(child.id);
    expect(reloadedChild).toBeDefined();
    expect(reloadedChild?.parentCategoryId).toBeUndefined();
  });
});
