import { describe, expect, it } from "vitest";
import { planMediaExport } from "./mediaExport";
import type { ContentBlock, Course, Unit } from "@/types/entities";

const course: Course = {
  id: "course-1",
  name: "CSAI 201",
  tagIds: [],
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const unit: Unit = {
  id: "unit-1",
  courseId: "course-1",
  title: "Lecture 01",
  type: "Lecture",
  order: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

interface ImageBlockOverrides {
  id?: string;
  unitId?: string;
  title?: string;
  blobId?: string;
  originalFileName?: string;
  mimeType?: string;
}

function imageBlock(overrides: ImageBlockOverrides = {}): ContentBlock {
  return {
    id: "block-1",
    unitId: "unit-1",
    title: "Handwritten note",
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    type: "image",
    blobId: "blob-1",
    originalFileName: "IMG_0001.JPG",
    mimeType: "image/jpeg",
    sizeBytes: 1000,
    ...overrides,
  };
}

function textBlock(): ContentBlock {
  return {
    id: "block-text",
    unitId: "unit-1",
    title: "Notes",
    order: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    type: "text",
    content: "hello",
  };
}

function fileBlock(): ContentBlock {
  return {
    id: "block-file",
    unitId: "unit-1",
    title: "Syllabus",
    order: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    type: "file",
    blobId: "blob-file",
    originalFileName: "syllabus.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2000,
  };
}

describe("planMediaExport", () => {
  it("includes only image blocks, never file or video blocks", () => {
    const plan = planMediaExport([course], [unit], [imageBlock(), textBlock(), fileBlock()]);
    expect(plan.imageCount).toBe(1);
    expect(plan.entries).toEqual([
      { blobId: "blob-1", path: "CSAI-201/Lecture-01/Handwritten-note.jpg" },
    ]);
  });

  it("derives the extension from the original filename, lowercased", () => {
    const plan = planMediaExport(
      [course],
      [unit],
      [imageBlock({ originalFileName: "diagram.PNG" })],
    );
    expect(plan.entries[0]!.path).toMatch(/\.png$/);
  });

  it("falls back to deriving an extension from the MIME type when the filename has none", () => {
    const plan = planMediaExport(
      [course],
      [unit],
      [imageBlock({ originalFileName: "no-extension", mimeType: "image/webp" })],
    );
    expect(plan.entries[0]!.path).toMatch(/\.webp$/);
  });

  it("de-duplicates identical filenames within the same course/unit folder", () => {
    const plan = planMediaExport(
      [course],
      [unit],
      [
        imageBlock({ id: "a", blobId: "blob-a", title: "Diagram" }),
        imageBlock({ id: "b", blobId: "blob-b", title: "Diagram" }),
      ],
    );
    expect(plan.entries.map((e) => e.path)).toEqual([
      "CSAI-201/Lecture-01/Diagram.jpg",
      "CSAI-201/Lecture-01/Diagram-2.jpg",
    ]);
  });

  it("sanitizes course/unit names with slashes or other unsafe path characters", () => {
    const weirdCourse: Course = { ...course, id: "course-2", name: "A/V & Media: Intro" };
    const weirdUnit: Unit = { ...unit, id: "unit-2", courseId: "course-2", title: "Week 1/2" };
    const plan = planMediaExport([weirdCourse], [weirdUnit], [imageBlock({ unitId: "unit-2" })]);
    expect(plan.entries[0]!.path).not.toMatch(/[/]{2,}/);
    expect(plan.entries[0]!.path.split("/")).toHaveLength(3);
  });

  it("skips a block whose unit or course can no longer be resolved rather than throwing", () => {
    const orphanBlock = imageBlock({ unitId: "missing-unit" });
    expect(() => planMediaExport([course], [unit], [orphanBlock])).not.toThrow();
    expect(planMediaExport([course], [unit], [orphanBlock]).entries).toHaveLength(0);
  });

  it("returns an empty plan when there are no image blocks", () => {
    const plan = planMediaExport([course], [unit], [textBlock(), fileBlock()]);
    expect(plan.imageCount).toBe(0);
    expect(plan.entries).toEqual([]);
  });
});
