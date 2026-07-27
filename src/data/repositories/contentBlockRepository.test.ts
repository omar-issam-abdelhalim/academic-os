import { describe, expect, it, beforeEach } from "vitest";
import { semesterDb } from "@/data/db";
import { createCourse } from "./courseRepository";
import { createUnit } from "./unitRepository";
import {
  createTextBlock,
  createUploadBlock,
  deleteBlock,
  getBlob,
  listBlocksForUnit,
  updateTextBlock,
  UploadValidationError,
} from "./contentBlockRepository";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
});

async function makeUnit() {
  const course = await createCourse({ name: "Course" });
  return createUnit({ courseId: course.id, title: "Unit", type: "Lecture" });
}

describe("contentBlockRepository", () => {
  it("creates a text block and renders it back verbatim (no sanitization loss at storage time)", async () => {
    const unit = await makeUnit();
    await createTextBlock(unit.id, "My Notes", "# Heading\n\nSome **bold** text.");
    const [block] = await listBlocksForUnit(unit.id);
    expect(block?.type).toBe("text");
    if (block?.type === "text") {
      expect(block.content).toBe("# Heading\n\nSome **bold** text.");
    }
  });

  it("updateTextBlock patches title/content", async () => {
    const unit = await makeUnit();
    const block = await createTextBlock(unit.id, "Draft", "v1");
    await updateTextBlock(block.id, { title: "Final", content: "v2" });
    const [reloaded] = await listBlocksForUnit(unit.id);
    expect(reloaded?.title).toBe("Final");
  });

  it("stores an uploaded file as a Blob and references it from the ContentBlock", async () => {
    const unit = await makeUnit();
    const file = new File([new Uint8Array(100)], "diagram.png", { type: "image/png" });
    const block = await createUploadBlock(unit.id, "image", "Diagram", file);
    expect(block.type).toBe("image");
    if (block.type !== "text") {
      const stored = await getBlob(block.blobId);
      expect(stored?.sizeBytes).toBe(100);
      expect(stored?.mimeType).toBe("image/png");
    }
  });

  it("rejects an upload whose declared MIME type doesn't match the block type", async () => {
    const unit = await makeUnit();
    const file = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    await expect(createUploadBlock(unit.id, "image", "Not an image", file)).rejects.toBeInstanceOf(
      UploadValidationError,
    );
  });

  it("deleteBlock removes the block and its underlying Blob together", async () => {
    const unit = await makeUnit();
    const file = new File([new Uint8Array(10)], "d.png", { type: "image/png" });
    const block = await createUploadBlock(unit.id, "image", "Diagram", file);

    await deleteBlock(block.id);

    expect(await semesterDb.contentBlocks.get(block.id)).toBeUndefined();
    if (block.type !== "text") {
      expect(await getBlob(block.blobId)).toBeUndefined();
    }
  });
});
