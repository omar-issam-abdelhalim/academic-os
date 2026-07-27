import { describe, expect, it, beforeEach } from "vitest";
import { preferencesDb, semesterDb } from "@/data/db";
import { createSemester } from "./semesterRepository";
import { createCourse, updateCourse } from "./courseRepository";
import { createTag } from "./tagRepository";
import { createTask, toggleTaskCompletion } from "./taskRepository";
import { buildSemesterArchive } from "./exportRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
  await preferencesDb.delete();
  await preferencesDb.open();
});

describe("buildSemesterArchive", () => {
  it("throws a clear error when there's no active semester rather than exporting an empty shell", async () => {
    await expect(buildSemesterArchive()).rejects.toThrow(/no active semester/i);
  });

  it("builds a self-validated archive including full TaskCompletionEvent history", async () => {
    await createSemester({ academicYear: "Year 2", label: "Semester 1" });
    const course = await createCourse({ name: "CSAI 101" });
    const task = await createTask({ title: "Study", courseId: course.id });
    await toggleTaskCompletion(task.id, true);
    await toggleTaskCompletion(task.id, false);
    await toggleTaskCompletion(task.id, true);

    const archive = await buildSemesterArchive();

    expect(archive.archiveVersion).toBe(1);
    expect(archive.semester.label).toBe("Semester 1");
    expect(archive.courses).toHaveLength(1);
    expect(archive.taskCompletionEvents).toHaveLength(3);
  });

  it("snapshots only the Tag definitions actually referenced by this semester's courses", async () => {
    await createSemester({ academicYear: "Year 2", label: "Semester 1" });
    const used = await createTag("University", "slate");
    await createTag("Unused", "amber");
    const course = await createCourse({ name: "CSAI 101" });
    await updateCourse(course.id, { tagIds: [used.id] });

    const archive = await buildSemesterArchive();

    expect(archive.tags).toHaveLength(1);
    expect(archive.tags[0]?.name).toBe("University");
  });

  it("never includes blob binary data — only content-block metadata", async () => {
    await createSemester({ academicYear: "Year 2", label: "Semester 1" });
    await createCourse({ name: "CSAI 101" });

    const archive = await buildSemesterArchive();
    expect(archive).not.toHaveProperty("blobs");
  });
});
