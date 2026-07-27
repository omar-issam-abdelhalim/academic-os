import { describe, expect, it, beforeEach } from "vitest";
import { semesterDb } from "@/data/db";
import { createCourse } from "./courseRepository";
import {
  createTemplate,
  deleteTemplate,
  ensureOccurrencesForDates,
  markAttendance,
  updateTemplate,
} from "./scheduleRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

// A known Saturday, matching the app's dayOfWeek=0 convention.
const SATURDAY = new Date(2026, 6, 4);
const SUNDAY = new Date(2026, 6, 5);

describe("scheduleRepository", () => {
  it("ensureOccurrencesForDates materializes an occurrence only for matching active templates", async () => {
    const course = await createCourse({ name: "CSAI 101" });
    await createTemplate({
      courseId: course.id,
      type: "Lecture",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:30",
    });

    const occurrences = await ensureOccurrencesForDates([SATURDAY, SUNDAY]);
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.date).toBe("2026-07-04");
    expect(occurrences[0]?.status).toBe("unmarked");
  });

  it("is idempotent — calling it again for the same dates creates no duplicates", async () => {
    const course = await createCourse({ name: "CSAI 101" });
    await createTemplate({
      courseId: course.id,
      type: "Lecture",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:30",
    });

    await ensureOccurrencesForDates([SATURDAY]);
    await ensureOccurrencesForDates([SATURDAY]);

    expect(await semesterDb.scheduleOccurrences.count()).toBe(1);
  });

  it("markAttendance updates status without regenerating or duplicating the occurrence", async () => {
    const course = await createCourse({ name: "CSAI 101" });
    await createTemplate({
      courseId: course.id,
      type: "Lecture",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:30",
    });
    const [occurrence] = await ensureOccurrencesForDates([SATURDAY]);

    await markAttendance(occurrence!.id, "attended");
    const reloaded = await semesterDb.scheduleOccurrences.get(occurrence!.id);
    expect(reloaded?.status).toBe("attended");
    expect(await semesterDb.scheduleOccurrences.count()).toBe(1);
  });

  it("editing a template never rewrites an already-generated occurrence's snapshot", async () => {
    const course = await createCourse({ name: "CSAI 101" });
    const template = await createTemplate({
      courseId: course.id,
      type: "Lecture",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:30",
      location: "Room A",
    });
    const [occurrence] = await ensureOccurrencesForDates([SATURDAY]);
    await markAttendance(occurrence!.id, "attended");

    await updateTemplate(template.id, { location: "Room B" });

    const reloaded = await semesterDb.scheduleOccurrences.get(occurrence!.id);
    expect(reloaded?.location).toBe("Room A");
  });

  it("deleting a template never deletes its already-generated occurrences", async () => {
    const course = await createCourse({ name: "CSAI 101" });
    const template = await createTemplate({
      courseId: course.id,
      type: "Lecture",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:30",
    });
    const [occurrence] = await ensureOccurrencesForDates([SATURDAY]);
    await markAttendance(occurrence!.id, "attended");

    await deleteTemplate(template.id);

    expect(await semesterDb.scheduleTemplates.get(template.id)).toBeUndefined();
    expect(await semesterDb.scheduleOccurrences.get(occurrence!.id)).toBeDefined();
  });

  it("never materializes an occurrence for a paused (inactive) template", async () => {
    const course = await createCourse({ name: "CSAI 101" });
    const template = await createTemplate({
      courseId: course.id,
      type: "Lecture",
      dayOfWeek: 0,
      startTime: "09:00",
      endTime: "10:30",
    });
    await updateTemplate(template.id, { active: false });

    const occurrences = await ensureOccurrencesForDates([SATURDAY]);
    expect(occurrences).toHaveLength(0);
  });
});
