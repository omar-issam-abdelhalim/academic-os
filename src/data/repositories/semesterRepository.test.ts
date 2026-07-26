import { describe, expect, it, beforeEach } from "vitest";
import { semesterDb, preferencesDb } from "@/data/db";
import { getActiveSemester, createSemester, startNewSemester } from "./semesterRepository";
import { createTag } from "./tagRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
  await preferencesDb.delete();
  await preferencesDb.open();
});

describe("semesterRepository", () => {
  it("has no active semester initially", async () => {
    expect(await getActiveSemester()).toBeUndefined();
  });

  it("creates and then retrieves the active semester", async () => {
    await createSemester({ academicYear: "Year 2", label: "Semester 1" });
    const semester = await getActiveSemester();
    expect(semester?.academicYear).toBe("Year 2");
    expect(semester?.label).toBe("Semester 1");
  });

  it("startNewSemester deletes the semester workspace but never touches preferencesDb (global Tags survive)", async () => {
    await createSemester({ academicYear: "Year 2", label: "Semester 1" });
    await createTag("University", "stone");

    await startNewSemester();

    expect(await getActiveSemester()).toBeUndefined();
    const tags = await preferencesDb.tags.toArray();
    expect(tags).toHaveLength(1);
    expect(tags[0]?.name).toBe("University");
  });
});
