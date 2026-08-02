import JSZip from "jszip";
import { semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { planMediaExport, type MediaExportPlan } from "@/domain/mediaExport";

/**
 * Media Export (PRODUCT_SPEC.md §17): a separate, optional zip of personal
 * images only — never original course PDFs/videos, never chained with the
 * semester archive or Start New Semester. Reads live repository data the
 * same way `exportRepository.ts` does, but is a fully independent code
 * path (no shared function with the semester archive or Clear/New
 * Semester), matching the "no accidental chaining" requirement that
 * already governs Export vs. Clear.
 */
export async function planActiveSemesterMediaExport(): Promise<MediaExportPlan> {
  return withStorageErrorHandling(async () => {
    const [courses, units, blocks] = await Promise.all([
      semesterDb.courses.toArray(),
      semesterDb.units.toArray(),
      semesterDb.contentBlocks.toArray(),
    ]);
    return planMediaExport(courses, units, blocks);
  });
}

export class NoMediaToExportError extends Error {
  constructor() {
    super("No personal images found in the current semester to export.");
    this.name = "NoMediaToExportError";
  }
}

/** Builds the zip in memory and triggers a browser download. Never touches
 * the network — local-first, like every other export path. */
export async function buildAndDownloadMediaExport(semesterLabel: string): Promise<number> {
  const plan = await planActiveSemesterMediaExport();
  if (plan.entries.length === 0) {
    throw new NoMediaToExportError();
  }

  return withStorageErrorHandling(async () => {
    const zip = new JSZip();
    for (const entry of plan.entries) {
      const blob = await semesterDb.blobs.get(entry.blobId);
      if (!blob) continue; // defensive: skip a dangling reference rather than failing the whole export
      zip.file(entry.path, blob.data);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const filename = `${sanitizeFilenamePart(semesterLabel)}-Media.zip`;
    const url = URL.createObjectURL(content);
    try {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
    return plan.entries.length;
  });
}

function sanitizeFilenamePart(value: string): string {
  return (
    value
      .trim()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "semester"
  );
}
