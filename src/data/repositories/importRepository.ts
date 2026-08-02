import { semesterDb, preferencesDb, clearSemesterWorkspace } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import type { SemesterArchive } from "@/domain/archive";
import {
  MAX_ARCHIVE_FILE_SIZE_BYTES,
  ImportFileTooLargeError,
  convertArchiveToInternalRecords,
  parseAndValidateArchiveText,
  summarizeArchive,
  type ImportSummary,
} from "@/domain/archiveImport";

export {
  ImportFileTooLargeError,
  ImportParseError,
  ImportVersionError,
  MAX_ARCHIVE_FILE_SIZE_BYTES,
} from "@/domain/archiveImport";
export { ArchiveValidationError } from "@/domain/archive";
export type { ImportSummary } from "@/domain/archiveImport";

export interface ImportPreview {
  archive: SemesterArchive;
  summary: ImportSummary;
}

/**
 * Step 1 of Import (PRODUCT_SPEC.md §18): read + defensively parse +
 * schema-validate a candidate archive `File` — never touches application
 * state. Throws a specific, typed error (too large / not JSON / wrong
 * version / fails schema) rather than ever crashing, per SECURITY.md §3
 * and STAGE_1A_UX_ARCHITECTURE.md §T ("Invalid/corrupt imported archive:
 * specific rejection reason shown; current semester is left completely
 * untouched").
 */
export async function readAndValidateArchiveFile(file: File): Promise<ImportPreview> {
  if (file.size > MAX_ARCHIVE_FILE_SIZE_BYTES) {
    throw new ImportFileTooLargeError(MAX_ARCHIVE_FILE_SIZE_BYTES);
  }
  const text = await file.text();
  const archive = parseAndValidateArchiveText(text);
  return { archive, summary: summarizeArchive(archive) };
}

export interface ImportResult {
  courseCount: number;
  taskCount: number;
}

/**
 * Step 2 of Import — actually replaces the active semester workspace.
 * Must only ever be called with an archive that already passed
 * `readAndValidateArchiveFile` and after the user has explicitly confirmed
 * the replacement in the UI; this function performs no further validation
 * of its own, only allow-listed writes (see `archiveImport.ts`'s
 * `convertArchiveToInternalRecords`).
 *
 * Import and "Start New Semester" remain conceptually independent actions
 * (Cross-Cutting Invariant #4 / SECURITY.md §9) — nothing here is reachable
 * from the Clear-Data code path or vice versa — but Import necessarily
 * clears the workspace first so imported data is never merged with
 * whatever the previous semester left behind.
 */
export async function importSemesterArchive(archive: SemesterArchive): Promise<ImportResult> {
  const converted = convertArchiveToInternalRecords(archive);

  return withStorageErrorHandling(async () => {
    await clearSemesterWorkspace();

    await semesterDb.transaction(
      "rw",
      [
        semesterDb.semester,
        semesterDb.courses,
        semesterDb.units,
        semesterDb.contentBlocks,
        semesterDb.tasks,
        semesterDb.taskCompletionEvents,
        semesterDb.scheduleTemplates,
        semesterDb.scheduleOccurrences,
        semesterDb.gradeCategories,
        semesterDb.gradeEntries,
        semesterDb.gradeBoundaries,
        semesterDb.practiceEntries,
        semesterDb.weeklyCheckIns,
      ],
      async () => {
        await semesterDb.semester.put(converted.semester);
        await semesterDb.courses.bulkPut(converted.courses);
        await semesterDb.units.bulkPut(converted.units);
        await semesterDb.contentBlocks.bulkPut(converted.contentBlocks);
        await semesterDb.tasks.bulkPut(converted.tasks);
        await semesterDb.taskCompletionEvents.bulkPut(converted.taskCompletionEvents);
        await semesterDb.scheduleTemplates.bulkPut(converted.scheduleTemplates);
        await semesterDb.scheduleOccurrences.bulkPut(converted.scheduleOccurrences);
        await semesterDb.gradeCategories.bulkPut(converted.gradeCategories);
        await semesterDb.gradeEntries.bulkPut(converted.gradeEntries);
        await semesterDb.gradeBoundaries.bulkPut(converted.gradeBoundaries);
        await semesterDb.practiceEntries.bulkPut(converted.practiceEntries);
        await semesterDb.weeklyCheckIns.bulkPut(converted.weeklyCheckIns);
      },
    );

    // Tags live in the separate, global preferences database
    // (DATA_MODEL.md §Tag) — insert-if-missing only, so Import can never
    // clobber a tag definition the user has since renamed/recolored on
    // this install. The archive's `tags` snapshot exists precisely so a
    // fresh install (or one where the tag was deleted) still gets a usable
    // definition back.
    await preferencesDb.transaction("rw", preferencesDb.tags, async () => {
      for (const tag of converted.tags) {
        const existing = await preferencesDb.tags.get(tag.id);
        if (!existing) {
          await preferencesDb.tags.put(tag);
        }
      }
    });

    return { courseCount: converted.courses.length, taskCount: converted.tasks.length };
  });
}
