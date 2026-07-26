import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Button, Field, Input } from "@/components";
import { startNewSemester } from "@/data/repositories/semesterRepository";
import styles from "./StartNewSemesterScreen.module.css";

const CONFIRM_PHRASE = "DELETE";

/**
 * Start New Semester — a real, working destructive action
 * (STAGE_1A_UX_ARCHITECTURE.md §O): full page (not a sheet, intentional
 * friction), explicit what's-deleted/what-survives list shown before the
 * typed-confirmation field, completely independent from Export
 * (PRODUCT_SPEC.md §19 / Cross-Cutting Invariant #4).
 */
export function StartNewSemesterScreen() {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  async function handleConfirm() {
    if (!canConfirm) return;
    setSubmitting(true);
    await startNewSemester();
    navigate("/semester-setup", { replace: true });
  }

  return (
    <div>
      <ScreenHeader title="Start New Semester" back />
      <div className={styles.content}>
        <div className={styles.warning}>
          <AlertTriangle size={20} strokeWidth={1.5} aria-hidden="true" />
          <p>This permanently deletes your current semester workspace. This cannot be undone.</p>
        </div>

        <section className={styles.listSection}>
          <h3 className={styles.listTitle}>This will delete:</h3>
          <ul className={styles.list}>
            <li>Courses, units, and content</li>
            <li>Tasks and their completion history</li>
            <li>Schedule and attendance records</li>
            <li>Official grades and practice scores</li>
            <li>Weekly check-ins</li>
          </ul>
        </section>

        <section className={styles.listSection}>
          <h3 className={styles.listTitle}>This will keep:</h3>
          <ul className={styles.list}>
            <li>Theme and notification preferences</li>
            <li>Your global Tags</li>
          </ul>
        </section>

        <p className={styles.exportReminder}>
          Haven&rsquo;t exported this semester yet? <a href="/data/export">Export it first</a> —
          exporting never deletes anything, and this action never exports for you automatically.
        </p>

        <Field label={`Type "${CONFIRM_PHRASE}" to confirm`} required>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          )}
        </Field>

        <Button
          variant="destructive"
          disabled={!canConfirm}
          loading={submitting}
          onClick={handleConfirm}
        >
          Delete current semester
        </Button>
      </div>
    </div>
  );
}
