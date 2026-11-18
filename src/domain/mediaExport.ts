/**
 * Media Export planning (PRODUCT_SPEC.md §17, DATA_MODEL.md §"Archive
 * Schema" closing note): a second, optional export dedicated to *personal*
 * images the user created (handwritten notes, whiteboard photos, personal
 * diagrams) — never original course-provided PDFs/videos, and never the
 * "file"/"video" content-block types. Only `ContentBlock` rows of
 * `type: "image"` are ever eligible.
 *
 * This module is pure planning logic (path/name derivation, collision
 * handling) so it is unit-testable without touching Dexie or JSZip;
 * `src/data/repositories/mediaExportRepository.ts` reads the real data and
 * turns the plan into an actual zip.
 *
 * Independently versioned from the semester archive (`ARCHIVE_VERSION` in
 * `src/domain/archive.ts`) since the two can evolve on separate schedules.
 */
import type { ContentBlock, Course, Unit } from "@/types/entities";

export const MEDIA_EXPORT_VERSION = 1;

export interface MediaExportEntry {
  blobId: string;
  /** Full path inside the zip, e.g. "CSAI-201/Lecture-01/handwritten-note-01.jpg" */
  path: string;
}

export interface MediaExportPlan {
  entries: MediaExportEntry[];
  imageCount: number;
}

function sanitizePathSegment(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

/** Best-effort file extension: prefer the original upload's extension (it
 * survived intake validation as a real image MIME type), fall back to
 * deriving one from the MIME subtype so a block never produces an
 * extensionless file in the zip. */
function extensionFor(originalFileName: string, mimeType: string): string {
  const fromName = /\.([a-z0-9]{2,5})$/i.exec(originalFileName)?.[1];
  if (fromName) return fromName.toLowerCase();
  const subtype = mimeType.split("/")[1]?.split("+")[0];
  return subtype ? subtype.toLowerCase() : "bin";
}

export type ImageContentBlock = Extract<ContentBlock, { type: "file" | "image" | "video" }> & {
  type: "image";
};

function isImageBlock(block: ContentBlock): block is ImageContentBlock {
  return block.type === "image";
}

/**
 * Builds the Course/Unit/filename plan for every image block, deduplicating
 * filenames within the same folder (e.g. two blocks both titled "Diagram")
 * by appending a numeric suffix rather than silently overwriting one in the
 * zip. Blocks whose Unit or Course can no longer be resolved (defensive —
 * should not happen given cascade-delete, but reads stay defensive per
 * SECURITY.md §10) are skipped rather than crashing the export.
 */
export function planMediaExport(
  courses: Pick<Course, "id" | "name">[],
  units: Pick<Unit, "id" | "courseId" | "title">[],
  blocks: ContentBlock[],
): MediaExportPlan {
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const usedPaths = new Set<string>();
  const entries: MediaExportEntry[] = [];

  for (const block of blocks.filter(isImageBlock)) {
    const unit = unitById.get(block.unitId);
    if (!unit) continue;
    const course = courseById.get(unit.courseId);
    if (!course) continue;

    const courseSegment = sanitizePathSegment(course.name, "Course");
    const unitSegment = sanitizePathSegment(unit.title, "Unit");
    const ext = extensionFor(block.originalFileName, block.mimeType);
    const baseName = sanitizePathSegment(block.title, "image");

    let candidate = `${baseName}.${ext}`;
    let counter = 2;
    let fullPath = `${courseSegment}/${unitSegment}/${candidate}`;
    while (usedPaths.has(fullPath)) {
      candidate = `${baseName}-${counter}.${ext}`;
      fullPath = `${courseSegment}/${unitSegment}/${candidate}`;
      counter += 1;
    }
    usedPaths.add(fullPath);
    entries.push({ blobId: block.blobId, path: fullPath });
  }

  return { entries, imageCount: entries.length };
}
