import { preferencesDb, semesterDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import { ARCHIVE_VERSION, parseSemesterArchive, type SemesterArchive } from "@/domain/archive";
import type { ContentBlock } from "@/types/entities";

const APP_VERSION = "0.4.0";

function toContentBlockMetadata(block: ContentBlock) {
  const base = {
    id: block.id,
    unitId: block.unitId,
    type: block.type,
    title: block.title,
    order: block.order,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  };
  if (block.type === "text") {
    return { ...base, content: block.content };
  }
  return {
    ...base,
    originalFileName: block.originalFileName,
    mimeType: block.mimeType,
    sizeBytes: block.sizeBytes,
  };
}

/**
 * Builds the Semester Export archive (PRODUCT_SPEC.md §16,
 * DATA_MODEL.md §"Archive Schema"): a self-contained snapshot of raw
 * structured data — including full `TaskCompletionEvent` history, per the
 * approved decision that export must preserve completion history, not
 * just current `Task.completed` state. Large blob binaries (files/images/
 * videos) are deliberately excluded; only their metadata is included.
 * Export never deletes or mutates anything (Cross-Cutting Invariant #4).
 */
export async function buildSemesterArchive(): Promise<SemesterArchive> {
  // Checked outside withStorageErrorHandling deliberately: "no active
  // semester" is an application-level precondition, not an IndexedDB
  // storage failure, and must keep its own specific message rather than
  // being reclassified into a generic StorageError.
  const semester = await withStorageErrorHandling(() => semesterDb.semester.toCollection().first());
  if (!semester) {
    throw new Error("No active semester to export.");
  }

  return withStorageErrorHandling(async () => {
    const [
      courses,
      units,
      contentBlocks,
      tasks,
      taskCompletionEvents,
      scheduleTemplates,
      scheduleOccurrences,
      gradeCategories,
      gradeEntries,
      gradeBoundaries,
      practiceEntries,
      weeklyCheckIns,
      allTags,
    ] = await Promise.all([
      semesterDb.courses.toArray(),
      semesterDb.units.toArray(),
      semesterDb.contentBlocks.toArray(),
      semesterDb.tasks.toArray(),
      semesterDb.taskCompletionEvents.toArray(),
      semesterDb.scheduleTemplates.toArray(),
      semesterDb.scheduleOccurrences.toArray(),
      semesterDb.gradeCategories.toArray(),
      semesterDb.gradeEntries.toArray(),
      semesterDb.gradeBoundaries.toArray(),
      semesterDb.practiceEntries.toArray(),
      semesterDb.weeklyCheckIns.toArray(),
      preferencesDb.tags.toArray(),
    ]);

    // Snapshot only the Tag definitions this semester's courses actually
    // reference (DATA_MODEL.md §"Archive Schema") — Tags are global, but
    // the archive stays self-contained even if the global table changes
    // later or the archive is opened by a different install.
    const referencedTagIds = new Set(courses.flatMap((c) => c.tagIds));
    const tags = allTags.filter((t) => referencedTagIds.has(t.id));

    const archive: SemesterArchive = {
      archiveVersion: ARCHIVE_VERSION,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      semester,
      tags,
      courses,
      units,
      contentBlockMetadata: contentBlocks.map(toContentBlockMetadata),
      tasks,
      taskCompletionEvents,
      scheduleTemplates,
      scheduleOccurrences,
      gradeCategories,
      gradeEntries,
      gradeBoundaries,
      practiceEntries,
      weeklyCheckIns,
    };

    // Export-time self-check (SECURITY.md §10): what we just built parses
    // and round-trips against the same schema Import will later use.
    return parseSemesterArchive(archive);
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

/** Serializes the archive and triggers a browser download — never touches
 * the network, matching the local-first requirement. */
export function downloadSemesterArchive(archive: SemesterArchive): void {
  const filename = `${sanitizeFilenamePart(archive.semester.academicYear)}-${sanitizeFilenamePart(
    archive.semester.label,
  )}.academic-archive.json`;
  const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
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
}
