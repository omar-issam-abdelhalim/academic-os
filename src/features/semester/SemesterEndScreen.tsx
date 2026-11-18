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
import {
  buildAndDownloadMediaExport,
  NoMediaToExportError,
} from "@/data/repositories/mediaExportRepository";
import styles from "./SemesterEndScreen.module.css";

/**
 * Semester End → review → Export (STAGE_1A_UX_ARCHITECTURE.md §O). A
 * *reviewing* flow, reachable any time — not gated behind a calendar end
 * date. Semester Export builds a self-validated JSON archive from the
 * actual semester data and downloads it; Media Export builds a separate
 * zip of personal images only. Both are real, fully independent code paths
 * (PRODUCT_SPEC.md §16/§17) — neither deletes or modifies anything, and
 * neither is chained to the other or to Start New Semester.
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
  const [exportingMedia, setExportingMedia] = useState(false);

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

  async function handleExportMedia() {
    setExportingMedia(true);
    setMessage(null);
    try {
      const count = await buildAndDownloadMediaExport(semester?.label ?? "semester");
      setMessage({
        tone: "success",
        text: `Media archive downloaded (${count} ${count === 1 ? "image" : "images"}).`,
      });
    } catch (error) {
      if (error instanceof NoMediaToExportError) {
        setMessage({
          tone: "info",
          text: "No personal images to export yet — add an image content block to a unit first.",
        });
      } else {
        setMessage({
          tone: "danger",
          text: "Couldn't build the media export. Try again.",
        });
      }
    } finally {
      setExportingMedia(false);
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
            onClick={handleExportMedia}
            loading={exportingMedia}
          >
            Export Media
          </Button>
        </div>

        {message && (
          <div role={message.tone === "danger" ? "alert" : "status"}>
            <StatusBadge tone={message.tone} className={styles.message}>
              {message.text}
            </StatusBadge>
          </div>
        )}
      </div>
    </div>
  );
}
