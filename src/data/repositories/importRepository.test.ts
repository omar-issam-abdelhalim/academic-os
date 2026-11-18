import { describe, expect, it, beforeEach } from "vitest";
import { preferencesDb, semesterDb } from "@/data/db";
import { createSemester } from "./semesterRepository";
import { createCourse } from "./courseRepository";
import { createUnit } from "./unitRepository";
import { createTag } from "./tagRepository";
import { createTask, toggleTaskCompletion } from "./taskRepository";
import { createGradeEntry } from "./gradeRepository";
import { createPracticeEntry } from "./practiceRepository";
import { buildSemesterArchive } from "./exportRepository";
import {
  ArchiveValidationError,
  ImportParseError,
  ImportVersionError,
  ImportFileTooLargeError,
  importSemesterArchive,
  readAndValidateArchiveFile,
} from "./importRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
  await preferencesDb.delete();
  await preferencesDb.open();
});

async function seedRealSemester() {
  await createSemester({ academicYear: "Year 2", label: "Semester 1" });
  const tag = await createTag("University", "teal");
  const course = await createCourse({ name: "CSAI 101", tagIds: [tag.id] });
  const unit = await createUnit({ courseId: course.id, title: "Lecture 1", type: "Lecture" });
  const task = await createTask({ title: "Study", courseId: course.id, unitId: unit.id });
  await toggleTaskCompletion(task.id, true);
  await toggleTaskCompletion(task.id, false);
  await toggleTaskCompletion(task.id, true);
  await createGradeEntry({ courseId: course.id, label: "Quiz 1", scoreEarned: 8, scoreMax: 10 });
  await createPracticeEntry({
    courseId: course.id,
    unitId: unit.id,
    label: "Practice 1",
    scoreEarned: 5,
    scoreMax: 5,
  });
  return { tag, course, unit, task };
}

describe("importSemesterArchive round-trip", () => {
  it("export -> import reproduces equivalent structured data", async () => {
    const seeded = await seedRealSemester();
    const archive = await buildSemesterArchive();

    // Simulate a fresh install/different workspace state before import.
    await semesterDb.delete();
    await semesterDb.open();

    const result = await importSemesterArchive(archive);

    expect(result.courseCount).toBe(1);
    expect(result.taskCount).toBe(1);

    const courses = await semesterDb.courses.toArray();
    expect(courses).toHaveLength(1);
    expect(courses[0]?.name).toBe("CSAI 101");
    expect(courses[0]?.tagIds).toEqual([seeded.tag.id]);

    const tasks = await semesterDb.tasks.toArray();
    expect(tasks[0]?.completed).toBe(true);

    // Full completion-event history survives, not just current state.
    const events = await semesterDb.taskCompletionEvents
      .where("taskId")
      .equals(seeded.task.id)
      .toArray();
    expect(events).toHaveLength(3);
    expect(events.filter((e) => e.toggledTo)).toHaveLength(2);
    expect(events.filter((e) => !e.toggledTo)).toHaveLength(1);

    const grades = await semesterDb.gradeEntries.toArray();
    expect(grades[0]?.scoreEarned).toBe(8);

    const practice = await semesterDb.practiceEntries.toArray();
    expect(practice[0]?.scoreEarned).toBe(5);

    // Tags are global — the archive's snapshot repopulates the preferences DB.
    const tags = await preferencesDb.tags.toArray();
    expect(tags).toHaveLength(1);
    expect(tags[0]?.name).toBe("University");
  });

  it("fully replaces the workspace — nothing from the pre-import semester survives", async () => {
    await seedRealSemester();
    const archive = await buildSemesterArchive();

    // A different, unrelated course exists before import runs.
    await semesterDb.delete();
    await semesterDb.open();
    await createSemester({ academicYear: "Year 1", label: "Old Semester" });
    await createCourse({ name: "Leftover Course" });

    await importSemesterArchive(archive);

    const courses = await semesterDb.courses.toArray();
    expect(courses.map((c) => c.name)).toEqual(["CSAI 101"]);
    const semester = await semesterDb.semester.toCollection().first();
    expect(semester?.label).toBe("Semester 1");
  });

  it("never overwrites a tag definition the user has since renamed locally (insert-if-missing only)", async () => {
    await seedRealSemester();
    const archive = await buildSemesterArchive();
    const archiveTagId = archive.tags[0]!.id;

    await semesterDb.delete();
    await semesterDb.open();
    await preferencesDb.tags.put({
      id: archiveTagId,
      name: "Renamed Locally",
      color: "rose",
      createdAt: "x",
      updatedAt: "x",
    });

    await importSemesterArchive(archive);

    const tag = await preferencesDb.tags.get(archiveTagId);
    expect(tag?.name).toBe("Renamed Locally");
  });
});

describe("readAndValidateArchiveFile", () => {
  function fileFrom(content: string, name = "archive.json"): File {
    return new File([content], name, { type: "application/json" });
  }

  it("returns a preview with the correct summary for a valid archive", async () => {
    await seedRealSemester();
    const archive = await buildSemesterArchive();
    const file = fileFrom(JSON.stringify(archive));

    const preview = await readAndValidateArchiveFile(file);
    expect(preview.summary.courseCount).toBe(1);
    expect(preview.summary.taskCount).toBe(1);
  });

  it("rejects a file over the size limit without reading its contents into the parser", async () => {
    const oversized = new File([new Uint8Array(1)], "big.json", { type: "application/json" });
    Object.defineProperty(oversized, "size", { value: 51 * 1024 * 1024 });
    await expect(readAndValidateArchiveFile(oversized)).rejects.toThrow(ImportFileTooLargeError);
  });

  it("rejects malformed JSON with a specific, non-crashing error", async () => {
    await expect(readAndValidateArchiveFile(fileFrom("{not json"))).rejects.toThrow(
      ImportParseError,
    );
  });

  it("rejects a well-formed-JSON-but-wrong-shape file via schema validation", async () => {
    await expect(readAndValidateArchiveFile(fileFrom('{"hello":"world"}'))).rejects.toThrow(
      ArchiveValidationError,
    );
  });

  it("rejects an archive from a newer app version with a specific reason", async () => {
    await seedRealSemester();
    const archive = await buildSemesterArchive();
    const future = { ...archive, archiveVersion: archive.archiveVersion + 1 };
    await expect(readAndValidateArchiveFile(fileFrom(JSON.stringify(future)))).rejects.toThrow(
      ImportVersionError,
    );
  });

  it("current semester is left completely untouched when a candidate file is rejected", async () => {
    await seedRealSemester();
    const before = await semesterDb.courses.toArray();

    await expect(readAndValidateArchiveFile(fileFrom("not even json"))).rejects.toThrow();

    const after = await semesterDb.courses.toArray();
    expect(after).toEqual(before);
  });
});
