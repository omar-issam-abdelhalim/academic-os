import { describe, expect, it } from "vitest";
import { ARCHIVE_VERSION, ArchiveValidationError, parseSemesterArchive } from "./archive";
import type { SemesterArchive } from "./archive";

function validArchive(): SemesterArchive {
  return {
    archiveVersion: ARCHIVE_VERSION,
    exportedAt: "2026-07-27T00:00:00.000Z",
    appVersion: "0.3.0",
    semester: {
      id: "sem-1",
      academicYear: "Year 2",
      label: "Semester 1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    tags: [],
    courses: [],
    units: [],
    contentBlockMetadata: [],
    tasks: [],
    taskCompletionEvents: [],
    scheduleTemplates: [],
    scheduleOccurrences: [],
    gradeCategories: [],
    gradeEntries: [],
    gradeBoundaries: [],
    practiceEntries: [],
    weeklyCheckIns: [],
  };
}

describe("parseSemesterArchive", () => {
  it("accepts a well-formed archive and round-trips it unchanged", () => {
    const archive = validArchive();
    expect(parseSemesterArchive(archive)).toEqual(archive);
  });

  it("rejects a payload with the wrong archive version rather than guessing", () => {
    const bad = { ...validArchive(), archiveVersion: 999 };
    expect(() => parseSemesterArchive(bad)).toThrow(ArchiveValidationError);
  });

  it("rejects a payload missing required top-level shape", () => {
    expect(() => parseSemesterArchive({ archiveVersion: ARCHIVE_VERSION })).toThrow(
      ArchiveValidationError,
    );
  });

  it("rejects completely malformed input without crashing", () => {
    expect(() => parseSemesterArchive("not an object")).toThrow(ArchiveValidationError);
    expect(() => parseSemesterArchive(null)).toThrow(ArchiveValidationError);
  });
});
