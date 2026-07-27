import { describe, expect, it } from "vitest";
import { validateUpload, maxSizeBytesFor } from "./contentValidation";

describe("validateUpload", () => {
  it("accepts a well-formed image under the size cap", () => {
    const result = validateUpload("image", { type: "image/png", size: 1024 });
    expect(result.ok).toBe(true);
  });

  it("rejects a file over the type's size cap", () => {
    const cap = maxSizeBytesFor("image");
    const result = validateUpload("image", { type: "image/png", size: cap + 1 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });

  it("rejects an empty file", () => {
    const result = validateUpload("file", { type: "application/pdf", size: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects a declared MIME type that doesn't match the block type", () => {
    const result = validateUpload("image", { type: "video/mp4", size: 1024 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/doesn't look like/i);
  });

  it("accepts a video under its own, larger cap", () => {
    const result = validateUpload("video", { type: "video/mp4", size: 1024 * 1024 * 50 });
    expect(result.ok).toBe(true);
  });
});
