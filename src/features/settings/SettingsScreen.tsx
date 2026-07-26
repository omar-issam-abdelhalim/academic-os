import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Download, RotateCcw } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { SegmentedControl, Toggle, Divider } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { semesterDb } from "@/data/db";
import styles from "./SettingsScreen.module.css";

const THEME_OPTIONS = [
  { value: "system" as const, label: "System" },
  { value: "light" as const, label: "Light" },
  { value: "dark" as const, label: "Dark" },
];

/**
 * Settings — reachable even before a semester exists
 * (STAGE_1A_UX_ARCHITECTURE.md §S), because AppPreferences lives in the
 * separate preferences database. Theme control here is real, persisted
 * state, not a fixture.
 */
export function SettingsScreen() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(
    null,
  );
  const semester = useLiveQuery(() => semesterDb.semester.toCollection().first(), []);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorageEstimate({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
      });
    }
  }, []);

  return (
    <div>
      <ScreenHeader title="Settings" />
      <div className={styles.content}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Appearance</h3>
          <SegmentedControl
            options={THEME_OPTIONS}
            value={theme}
            onChange={setTheme}
            label="Theme"
          />
        </section>

        <Divider />

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Notifications</h3>
          <Toggle
            checked={notificationsEnabled}
            onChange={setNotificationsEnabled}
            label="Class reminders"
          />
          <p className={styles.hint}>
            Reminders work while Academic OS is open or recently used — not as a guaranteed
            background alarm on every platform. See docs/ARCHITECTURE.md for why.
          </p>
        </section>

        <Divider />

        {semester && (
          <>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Semester</h3>
              <p className={styles.value}>
                {semester.academicYear} · {semester.label}
              </p>
            </section>
            <Divider />
          </>
        )}

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Data</h3>
          <button type="button" className={styles.row} onClick={() => navigate("/data/export")}>
            <Download size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.rowLabel}>Semester End &amp; Export</span>
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              className={styles.chevron}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className={`${styles.row} ${styles.danger}`}
            onClick={() => navigate("/data/new-semester")}
          >
            <RotateCcw size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.rowLabel}>Start New Semester</span>
            <ChevronRight
              size={16}
              strokeWidth={1.5}
              className={styles.chevron}
              aria-hidden="true"
            />
          </button>
        </section>

        <Divider />

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>About</h3>
          <p className={styles.value}>Academic OS · v0.2.0</p>
          {storageEstimate && storageEstimate.quota > 0 && (
            <p className={styles.hint}>
              Using {(storageEstimate.usage / (1024 * 1024)).toFixed(1)} MB of{" "}
              {(storageEstimate.quota / (1024 * 1024)).toFixed(0)} MB estimated available storage.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
