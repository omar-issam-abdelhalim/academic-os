import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Image as ImageIcon, ShieldCheck } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { Button, StatusBadge } from "@/components";
import { semesterDb } from "@/data/db";
import { fixtureTasks, fixtureScheduleOccurrences } from "@/fixtures";
import styles from "./SemesterEndScreen.module.css";

/**
 * Semester End → review → Export (STAGE_1A_UX_ARCHITECTURE.md §O). A
 * *reviewing* flow, reachable any time — not gated behind a calendar end
 * date. The actual archive-generation engine is Stage 7; this reference
 * screen makes the export/no-delete relationship explicit and honest
 * about what isn't wired up yet, rather than faking a successful export.
 */
export function SemesterEndScreen() {
  const semester = useLiveQuery(() => semesterDb.semester.toCollection().first(), []);
  const [message, setMessage] = useState<string | null>(null);

  const completedTasks = fixtureTasks.filter((t) => t.completed).length;
  const attended = fixtureScheduleOccurrences.filter((o) => o.status === "attended").length;

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
            <span className="numeric">{completedTasks}</span>{" "}
            {completedTasks === 1 ? "task" : "tasks"} completed this semester
          </p>
          <p className={styles.summaryLine}>
            <span className="numeric">{attended}</span> {attended === 1 ? "class" : "classes"}{" "}
            attended (reference data)
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
            onClick={() =>
              setMessage(
                "Semester archive export arrives in Stage 7 — this button is a reference placeholder.",
              )
            }
          >
            Export Semester Archive
          </Button>
          <Button
            variant="secondary"
            icon={<ImageIcon size={18} strokeWidth={1.5} aria-hidden="true" />}
            onClick={() =>
              setMessage(
                "Media export arrives in Stage 7 — this button is a reference placeholder.",
              )
            }
          >
            Export Media
          </Button>
        </div>

        {message && (
          <StatusBadge tone="info" className={styles.message}>
            {message}
          </StatusBadge>
        )}
      </div>
    </div>
  );
}
