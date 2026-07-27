import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Button, StatusBadge } from "@/components";
import { semesterDb } from "@/data/db";
import {
  buildSemesterArchive,
  downloadSemesterArchive,
} from "@/data/repositories/exportRepository";
import styles from "./SemesterEndScreen.module.css";

/**
 * Semester End → review → Export (STAGE_1A_UX_ARCHITECTURE.md §O). A
 * *reviewing* flow, reachable any time — not gated behind a calendar end
 * date. Export is real (Stage 3): it builds a self-validated JSON archive
 * from the actual semester data and downloads it — it never deletes or
 * modifies anything (PRODUCT_SPEC.md §16). Media export (personal
 * images/handwritten notes, a separate zip) remains explicitly deferred —
 * PRODUCT_SPEC.md §17 marks it a distinct, later feature.
 */
export function SemesterEndScreen() {
  const semester = useLiveQuery(() => semesterDb.semester.toCollection().first(), []);
  const completedTaskCount = useLiveQuery(
    () => semesterDb.tasks.filter((t) => t.completed).count(),
    [],
  );
  const attendedCount = useLiveQuery(
    () => semesterDb.scheduleOccurrences.filter((o) => o.status === "attended").count(),
    [],
  );
  const [message, setMessage] = useState<{
    tone: "info" | "success" | "danger";
    text: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
    try {
      const archive = await buildSemesterArchive();
      downloadSemesterArchive(archive);
      setMessage({ tone: "success", text: "Semester archive downloaded." });
    } catch {
      setMessage({
        tone: "danger",
        text: "Couldn't build the export. Make sure a semester is active and try again.",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <ScreenHeader title="Semester End" back />
      <div className={styles.content}>
        {semester && (
          <p className={styles.semesterLabel}>
            {semester.academicYear} · {semester.label}
          </p>
        )}

        <section className={styles.summary}>
          <p className={styles.summaryLine}>
            <span className="numeric">{completedTaskCount ?? 0}</span>{" "}
            {completedTaskCount === 1 ? "task" : "tasks"} completed this semester
          </p>
          <p className={styles.summaryLine}>
            <span className="numeric">{attendedCount ?? 0}</span>{" "}
            {attendedCount === 1 ? "class" : "classes"} attended
          </p>
        </section>

        <div className={styles.notice}>
          <ShieldCheck size={18} strokeWidth={1.5} aria-hidden="true" />
          <p>
            Exporting never deletes your semester. Export and "Start New Semester" are completely
            independent actions.
          </p>
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />}
            onClick={handleExport}
            loading={exporting}
          >
            Export Semester Archive
          </Button>
          <Button
            variant="secondary"
            icon={<ImageIcon size={18} strokeWidth={1.5} aria-hidden="true" />}
            onClick={() =>
              setMessage({
                tone: "info",
                text: "Media export (personal images/handwritten notes) is planned for a later stage — this button is an honest placeholder.",
              })
            }
          >
            Export Media
          </Button>
        </div>

        {message && (
          <StatusBadge tone={message.tone} className={styles.message}>
            {message.text}
          </StatusBadge>
        )}
      </div>
    </div>
  );
}
