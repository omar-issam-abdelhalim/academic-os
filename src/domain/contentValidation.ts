/**
 * Intake-time validation for file/image/video Content Blocks
 * (SECURITY.md §2): declared MIME type + a size cap appropriate to the
 * block type, checked *before* a file is accepted into a ContentBlock.
 * This is an intake filter, not a content-safety guarantee — the app
 * never executes, evals, or interprets uploaded bytes as code regardless
 * of what passes this check; files are always stored/served as opaque
 * Blobs.
 */

export type UploadBlockType = "file" | "image" | "video";

const SIZE_CAPS_BYTES: Record<UploadBlockType, number> = {
  image: 15 * 1024 * 1024,
  file: 30 * 1024 * 1024,
  video: 250 * 1024 * 1024,
};

const ALLOWED_MIME_PREFIXES: Record<UploadBlockType, string[]> = {
  image: ["image/"],
  video: ["video/"],
  file: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats",
    "application/vnd.ms-",
    "text/plain",
  ],
};

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
}

export function maxSizeBytesFor(blockType: UploadBlockType): number {
  return SIZE_CAPS_BYTES[blockType];
}

export function validateUpload(
  blockType: UploadBlockType,
  file: { type: string; size: number; name?: string },
): UploadValidationResult {
  if (file.size === 0) {
    return { ok: false, error: "That file appears to be empty." };
  }
  const cap = SIZE_CAPS_BYTES[blockType];
  if (file.size > cap) {
    return {
      ok: false,
      error: `That file is too large — the limit for ${blockType} content is ${Math.round(cap / (1024 * 1024))} MB.`,
    };
  }
  const prefixes = ALLOWED_MIME_PREFIXES[blockType];
  const declaredType = file.type || "";
  const matches = prefixes.some((prefix) => declaredType.startsWith(prefix));
  if (!matches) {
    return {
      ok: false,
      error: `That doesn't look like a ${blockType} file (declared type: ${declaredType || "unknown"}).`,
    };
  }
  return { ok: true };
}
