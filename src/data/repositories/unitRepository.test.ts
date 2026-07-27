import { describe, expect, it, beforeEach } from "vitest";
import { semesterDb } from "@/data/db";
import { createCourse } from "./courseRepository";
import { createUnit, deleteUnit, listUnitsForCourse, updateUnit } from "./unitRepository";
import { createTextBlock } from "./contentBlockRepository";
import { createTask } from "./taskRepository";
import { createPracticeEntry } from "./practiceRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

describe("unitRepository", () => {
  it("creates units with per-course incrementing order", async () => {
    const course = await createCourse({ name: "Course" });
    const u1 = await createUnit({ courseId: course.id, title: "Unit 1", type: "Lecture" });
    const u2 = await createUnit({ courseId: course.id, title: "Unit 2", type: "Tutorial" });
    expect(u1.order).toBe(0);
    expect(u2.order).toBe(1);
    expect((await listUnitsForCourse(course.id)).map((u) => u.title)).toEqual(["Unit 1", "Unit 2"]);
  });

  it("updateUnit patches title/type", async () => {
    const course = await createCourse({ name: "Course" });
    const unit = await createUnit({ courseId: course.id, title: "Draft", type: "Lecture" });
    await updateUnit(unit.id, { title: "Final", type: "Lab" });
    const [reloaded] = await listUnitsForCourse(course.id);
    expect(reloaded?.title).toBe("Final");
    expect(reloaded?.type).toBe("Lab");
  });

  it("deleteUnit cascades content/unit-scoped tasks/practice but never touches course-scoped ones", async () => {
    const course = await createCourse({ name: "Course" });
    const unit = await createUnit({ courseId: course.id, title: "Unit", type: "Lecture" });
    await createTextBlock(unit.id, "Notes", "text");
    const unitTask = await createTask({ title: "Unit task", courseId: course.id, unitId: unit.id });
    const courseTask = await createTask({ title: "Course task", courseId: course.id });
    await createPracticeEntry({
      courseId: course.id,
      unitId: unit.id,
      label: "Practice",
      scoreEarned: 1,
      scoreMax: 2,
    });
    await createPracticeEntry({
      courseId: course.id,
      label: "Course-level practice",
      scoreEarned: 1,
      scoreMax: 2,
    });

    await deleteUnit(unit.id);

    expect(await semesterDb.units.get(unit.id)).toBeUndefined();
    expect(await semesterDb.contentBlocks.where("unitId").equals(unit.id).count()).toBe(0);
    expect(await semesterDb.tasks.get(unitTask.id)).toBeUndefined();
    expect(await semesterDb.tasks.get(courseTask.id)).toBeDefined();
    expect(await semesterDb.practiceEntries.where("unitId").equals(unit.id).count()).toBe(0);
    expect(
      await semesterDb.practiceEntries.filter((p) => p.courseId === course.id && !p.unitId).count(),
    ).toBe(1);
  });
});
