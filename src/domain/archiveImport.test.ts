import { describe, expect, it } from "vitest";
import { ARCHIVE_VERSION, ArchiveValidationError, type SemesterArchive } from "./archive";
import {
  ImportParseError,
  ImportVersionError,
  convertArchiveToInternalRecords,
  parseAndValidateArchiveText,
  summarizeArchive,
} from "./archiveImport";

function validArchive(): SemesterArchive {
  return {
    archiveVersion: ARCHIVE_VERSION,
    exportedAt: "2026-07-27T00:00:00.000Z",
    appVersion: "0.4.0",
    semester: {
      id: "sem-1",
      academicYear: "Year 2",
      label: "Semester 1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    tags: [{ id: "tag-1", name: "University", color: "slate", createdAt: "x", updatedAt: "x" }],
    courses: [
      {
        id: "course-1",
        name: "CSAI 101",
        tagIds: ["tag-1"],
        order: 0,
        createdAt: "x",
        updatedAt: "x",
      },
    ],
    units: [
      {
        id: "unit-1",
        courseId: "course-1",
        title: "Lecture 1",
        type: "Lecture",
        order: 0,
        createdAt: "x",
        updatedAt: "x",
      },
    ],
    contentBlockMetadata: [
      {
        id: "block-text",
        unitId: "unit-1",
        type: "text",
        title: "Notes",
        order: 0,
        content: "hello",
        createdAt: "x",
        updatedAt: "x",
      },
      {
        id: "block-image",
        unitId: "unit-1",
        type: "image",
        title: "Diagram",
        order: 1,
        originalFileName: "diagram.png",
        mimeType: "image/png",
        sizeBytes: 1234,
        createdAt: "x",
        updatedAt: "x",
      },
    ],
    tasks: [
      {
        id: "task-1",
        courseId: "course-1",
        title: "Study",
        completed: true,
        completedAt: "x",
        createdAt: "x",
        updatedAt: "x",
      },
    ],
    taskCompletionEvents: [{ id: "evt-1", taskId: "task-1", toggledTo: true, at: "x" }],
    scheduleTemplates: [],
    scheduleOccurrences: [],
    gradeCategories: [],
    gradeEntries: [],
    gradeBoundaries: [],
    practiceEntries: [],
    weeklyCheckIns: [],
  };
}

describe("parseAndValidateArchiveText", () => {
  it("accepts a well-formed archive JSON string", () => {
    const archive = parseAndValidateArchiveText(JSON.stringify(validArchive()));
    expect(archive.semester.label).toBe("Semester 1");
  });

  it("throws ImportParseError (never crashes) on malformed JSON", () => {
    expect(() => parseAndValidateArchiveText("{not valid json")).toThrow(ImportParseError);
  });

  it("throws ImportParseError on a JSON value that isn't an object at all", () => {
    expect(() => parseAndValidateArchiveText('"just a string"')).toThrow();
  });

  it("gives a specific 'too new' reason for a future archiveVersion rather than a generic shape error", () => {
    const bad = { ...validArchive(), archiveVersion: 999 };
    try {
      parseAndValidateArchiveText(JSON.stringify(bad));
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportVersionError);
      expect((error as ImportVersionError).kind).toBe("too-new");
      expect((error as Error).message).toMatch(/newer version/i);
    }
  });

  it("gives a specific 'too old' reason for a lower archiveVersion", () => {
    const bad = { ...validArchive(), archiveVersion: 0 };
    try {
      parseAndValidateArchiveText(JSON.stringify(bad));
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ImportVersionError);
      expect((error as ImportVersionError).kind).toBe("too-old");
    }
  });

  it("falls through to schema validation (ArchiveValidationError) for other shape problems", () => {
    expect(() =>
      parseAndValidateArchiveText(JSON.stringify({ archiveVersion: ARCHIVE_VERSION })),
    ).toThrow(ArchiveValidationError);
  });
});

describe("summarizeArchive", () => {
  it("counts every top-level collection without mutating the archive", () => {
    const archive = validArchive();
    const summary = summarizeArchive(archive);
    expect(summary.courseCount).toBe(1);
    expect(summary.taskCount).toBe(1);
    expect(summary.gradeEntryCount).toBe(0);
    expect(summary.practiceEntryCount).toBe(0);
    expect(archive.courses).toHaveLength(1); // unchanged
  });
});

describe("convertArchiveToInternalRecords", () => {
  it("constructs every table's records field-by-field, preserving ids and values", () => {
    const converted = convertArchiveToInternalRecords(validArchive());
    expect(converted.courses).toEqual([
      {
        id: "course-1",
        name: "CSAI 101",
        code: undefined,
        instructor: undefined,
        description: undefined,
        tagIds: ["tag-1"],
        order: 0,
        createdAt: "x",
        updatedAt: "x",
      },
    ]);
    expect(converted.tasks[0]?.id).toBe("task-1");
    expect(converted.taskCompletionEvents[0]?.id).toBe("evt-1");
  });

  it("falls back to a safe default tag color for a value outside the curated palette", () => {
    const archive = validArchive();
    archive.tags = [{ ...archive.tags[0]!, color: "not-a-real-color" }];
    const converted = convertArchiveToInternalRecords(archive);
    expect(converted.tags[0]?.color).toBe("slate");
  });

  it("preserves a valid curated tag color unchanged", () => {
    const archive = validArchive();
    archive.tags = [{ ...archive.tags[0]!, color: "amber" }];
    const converted = convertArchiveToInternalRecords(archive);
    expect(converted.tags[0]?.color).toBe("amber");
  });

  it("regenerates a fresh blobId for file/image/video blocks (the archive never carries binary data)", () => {
    const converted = convertArchiveToInternalRecords(validArchive());
    const imageBlock = converted.contentBlocks.find((b) => b.id === "block-image");
    expect(imageBlock?.type).toBe("image");
    if (imageBlock?.type === "image") {
      expect(imageBlock.blobId).toBeTruthy();
      expect(imageBlock.blobId).not.toBe("block-image");
    }
  });

  it("preserves text block content exactly", () => {
    const converted = convertArchiveToInternalRecords(validArchive());
    const textBlock = converted.contentBlocks.find((b) => b.id === "block-text");
    expect(textBlock?.type).toBe("text");
    if (textBlock?.type === "text") {
      expect(textBlock.content).toBe("hello");
    }
  });

  it("a __proto__ key smuggled into the raw JSON text never survives the parse->convert pipeline or pollutes Object.prototype", () => {
    const raw = JSON.parse(JSON.stringify(validArchive())) as Record<string, unknown>;
    const course = (raw.courses as Record<string, unknown>[])[0]!;
    // Object.defineProperty (unlike `course.__proto__ = x` or object-literal
    // syntax) creates a genuine *own* enumerable property literally named
    // "__proto__" rather than tripping the special prototype-assignment
    // trap — this is what a JSON.parse of hostile wire text would actually
    // produce, so it's the realistic thing to smuggle through JSON.stringify.
    Object.defineProperty(course, "__proto__", {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
    });

    const archive = parseAndValidateArchiveText(JSON.stringify(raw));
    const converted = convertArchiveToInternalRecords(archive);

    expect(Object.prototype.hasOwnProperty.call(converted.courses[0], "__proto__")).toBe(false);
    expect((converted.courses[0] as unknown as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
