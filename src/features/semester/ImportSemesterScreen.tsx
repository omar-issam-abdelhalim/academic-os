import { useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, Upload } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Button, ConfirmationDialog, Field, StatusBadge } from "@/components";
import {
  ArchiveValidationError,
  ImportFileTooLargeError,
  ImportParseError,
  ImportVersionError,
  importSemesterArchive,
  readAndValidateArchiveFile,
  type ImportPreview,
} from "@/data/repositories/importRepository";
import styles from "./ImportSemesterScreen.module.css";

/**
 * Import (PRODUCT_SPEC.md §18, SECURITY.md §3, STAGE_1A_UX_ARCHITECTURE.md
 * §T/§O): every selected file is treated as fully untrusted — defensive
 * parse, versioned Zod validation, and a specific rejection reason on
 * failure, with the current semester left completely untouched. Only after
 * validation succeeds does the user see a preview and an explicit
 * confirmation step; nothing is written until that confirmation. Export and
 * Import remain independent (no forced "export first"), and Import is a
 * fully separate code path from Start New Semester.
 */
export function ImportSemesterScreen() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "info" | "danger"; text: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file after a rejection
    if (!file) return;

    setPreview(null);
    setFileName(file.name);
    setMessage(null);

    try {
      const result = await readAndValidateArchiveFile(file);
      setPreview(result);
    } catch (error) {
      setMessage({ tone: "danger", text: describeImportError(error) });
    }
  }

  async function handleConfirmImport() {
    if (!preview) return;
    setImporting(true);
    try {
      await importSemesterArchive(preview.archive);
      setConfirmOpen(false);
      navigate("/home", { replace: true });
    } catch {
      setMessage({
        tone: "danger",
        text: "Couldn't finish the import — your current semester was not changed. Try again.",
      });
      setConfirmOpen(false);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <ScreenHeader title="Import Semester" back />
      <div className={styles.content}>
        <div className={styles.notice}>
          <AlertTriangle size={18} strokeWidth={1.5} aria-hidden="true" />
          <p>
            Importing replaces your entire current semester with the contents of the archive. This
            cannot be undone once confirmed.
          </p>
        </div>

        <p className={styles.exportReminder}>
          Haven&rsquo;t exported your current semester yet?{" "}
          <Link to="/data/export">Export it first</Link> — recommended, not required.
        </p>

        <Field
          label="Semester archive file"
          hint="A .academic-archive.json file from Semester Export."
        >
          {(fieldProps) => (
            <input
              {...fieldProps}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
            />
          )}
        </Field>

        {fileName && !preview && !message && <p className={styles.fileName}>Reading {fileName}…</p>}

        {message && (
          <div role={message.tone === "danger" ? "alert" : "status"}>
            <StatusBadge tone={message.tone} className={styles.message}>
              {message.text}
            </StatusBadge>
          </div>
        )}

        {preview && (
          <>
            <section className={styles.summary} aria-label="Archive preview">
              <h3 className={styles.summaryTitle}>This archive contains:</h3>
              <p className={styles.summaryLine}>
                {preview.summary.academicYear} · {preview.summary.label}
              </p>
              <p className={styles.summaryLine}>
                Exported {new Date(preview.summary.exportedAt).toLocaleString()}
              </p>
              <p className={styles.summaryLine}>
                <span className="numeric">{preview.summary.courseCount}</span>{" "}
                {preview.summary.courseCount === 1 ? "course" : "courses"} ·{" "}
                <span className="numeric">{preview.summary.taskCount}</span>{" "}
                {preview.summary.taskCount === 1 ? "task" : "tasks"} ·{" "}
                <span className="numeric">{preview.summary.gradeEntryCount}</span> grade entries ·{" "}
                <span className="numeric">{preview.summary.practiceEntryCount}</span> practice
                entries
              </p>
            </section>

            <div className={styles.warning}>
              <AlertTriangle size={18} strokeWidth={1.5} aria-hidden="true" />
              <p>
                Confirming will permanently delete your current semester&rsquo;s courses, units,
                tasks, schedule, grades, and practice entries, and replace them with the archive
                above.
              </p>
            </div>

            <Button
              variant="destructive"
              icon={<Upload size={18} strokeWidth={1.5} aria-hidden="true" />}
              onClick={() => setConfirmOpen(true)}
            >
              Replace current semester with this archive
            </Button>
          </>
        )}
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmImport}
        title="Replace current semester?"
        description="This deletes your current semester's data and replaces it with the imported archive. This cannot be undone."
        confirmLabel={importing ? "Importing…" : "Replace semester"}
        destructive
      />
    </div>
  );
}

function describeImportError(error: unknown): string {
  if (error instanceof ImportFileTooLargeError) return error.message;
  if (error instanceof ImportParseError) return error.message;
  if (error instanceof ImportVersionError) return error.message;
  if (error instanceof ArchiveValidationError) {
    return "This file doesn't match the expected semester archive format and couldn't be imported.";
  }
  return "Couldn't read this file. Your current semester was not changed.";
}
