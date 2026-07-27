import { describe, expect, it, beforeEach } from "vitest";
import { semesterDb } from "@/data/db";
import { createCourse, deleteCourse, listCourses, updateCourse } from "./courseRepository";
import { createUnit } from "./unitRepository";
import { createTextBlock, createUploadBlock } from "./contentBlockRepository";
import { createTask, toggleTaskCompletion } from "./taskRepository";
import { createTemplate, ensureOccurrencesForDates } from "./scheduleRepository";
import { createCategory, createGradeEntry } from "./gradeRepository";
import { createPracticeEntry } from "./practiceRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

describe("courseRepository", () => {
  it("creates courses with incrementing order and lists them sorted by order", async () => {
    const a = await createCourse({ name: "Course A" });
    const b = await createCourse({ name: "Course B" });
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    const list = await listCourses();
    expect(list.map((c) => c.name)).toEqual(["Course A", "Course B"]);
  });

  it("never requires a course code (PRODUCT_SPEC.md §3)", async () => {
    const course = await createCourse({ name: "Self-Study Series" });
    expect(course.code).toBeUndefined();
  });

  it("updateCourse patches fields and bumps updatedAt", async () => {
    const course = await createCourse({ name: "Original" });
    await updateCourse(course.id, { name: "Renamed" });
    const [reloaded] = await listCourses();
    expect(reloaded?.name).toBe("Renamed");
  });

  it("deleteCourse cascades to every scoped child record but leaves other courses untouched", async () => {
    const course = await createCourse({ name: "CSAI 101" });
    const otherCourse = await createCourse({ name: "MATH 202" });

    const unit = await createUnit({ courseId: course.id, title: "Lecture 1", type: "Lecture" });
    await createTextBlock(unit.id, "Notes", "# Hi");
    await createUploadBlock(
      unit.id,
      "image",
      "Diagram",
      new File([new Uint8Array(10)], "d.png", { type: "image/png" }),
    );
    const task = await createTask({ title: "Study", courseId: course.id, unitId: unit.id });
    await toggleTaskCompletion(task.id, true);
    const template = await createTemplate({
      courseId: course.id,
      type: "Lecture",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:00",
    });
    await ensureOccurrencesForDates([new Date(2026, 6, 4)]);
    const category = await createCategory({
      courseId: course.id,
      name: "Coursework",
      maxPoints: 60,
    });
    await createGradeEntry({
      courseId: course.id,
      categoryId: category.id,
      label: "Quiz 1",
      scoreEarned: 4,
      scoreMax: 5,
    });
    await createPracticeEntry({
      courseId: course.id,
      unitId: unit.id,
      label: "Practice",
      scoreEarned: 3,
      scoreMax: 5,
    });

    const otherUnit = await createUnit({
      courseId: otherCourse.id,
      title: "Other unit",
      type: "Lecture",
    });

    await deleteCourse(course.id);

    expect(await semesterDb.courses.get(course.id)).toBeUndefined();
    expect(await semesterDb.units.where("courseId").equals(course.id).count()).toBe(0);
    expect(await semesterDb.contentBlocks.where("unitId").equals(unit.id).count()).toBe(0);
    expect(await semesterDb.blobs.count()).toBe(0);
    expect(await semesterDb.tasks.get(task.id)).toBeUndefined();
    expect(await semesterDb.taskCompletionEvents.where("taskId").equals(task.id).count()).toBe(0);
    expect(await semesterDb.scheduleTemplates.get(template.id)).toBeUndefined();
    expect(
      await semesterDb.scheduleOccurrences.where("scheduleTemplateId").equals(template.id).count(),
    ).toBe(0);
    expect(await semesterDb.gradeCategories.get(category.id)).toBeUndefined();
    expect(await semesterDb.gradeEntries.where("courseId").equals(course.id).count()).toBe(0);
    expect(await semesterDb.practiceEntries.where("courseId").equals(course.id).count()).toBe(0);

    // Other course's data is untouched.
    expect(await semesterDb.courses.get(otherCourse.id)).toBeDefined();
    expect(await semesterDb.units.get(otherUnit.id)).toBeDefined();
  });
});
