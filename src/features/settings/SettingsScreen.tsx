import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, ChevronRight, Download, RotateCcw, Upload } from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import { SegmentedControl, Toggle, Divider } from "@/components";
import { useTheme } from "@/hooks/useTheme";
import { getPreferences, updatePreferences } from "@/data/repositories/preferencesRepository";
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
 * separate preferences database. Theme and notification preferences are
 * both real, persisted state (Stage 3 extends notifications from a
 * Stage 2 stub to genuine `AppPreferences.notificationsEnabled`
 * persistence).
 */
export function SettingsScreen() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(
    null,
  );
  const semester = useLiveQuery(() => semesterDb.semester.toCollection().first(), []);

  useEffect(() => {
    getPreferences().then((prefs) => {
      setNotificationsEnabled(prefs.notificationsEnabled);
      if (
        prefs.notificationsEnabled &&
        typeof Notification !== "undefined" &&
        Notification.permission === "denied"
      ) {
        setPermissionDenied(true);
      }
    });
  }, []);

  useEffect(() => {
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorageEstimate({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
      });
    }
  }, []);

  async function handleNotificationsChange(next: boolean) {
    setNotificationsEnabled(next);
    await updatePreferences({ notificationsEnabled: next });

    if (!next || typeof Notification === "undefined") return;
    // Only ever requested here — in direct response to the user explicitly
    // turning this on — never automatically on load. If the browser has
    // already denied it, `requestPermission()` resolves "denied" without
    // showing any UI, so this can never "nag" with a repeat prompt
    // (STAGE_1A_UX_ARCHITECTURE.md §T).
    const result =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    setPermissionDenied(result === "denied");
  }

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
            onChange={handleNotificationsChange}
            label="Class reminders"
          />
          <p className={styles.hint}>
            Reminders work while Academic OS is open or recently used — not as a guaranteed
            background alarm on every platform. See docs/ARCHITECTURE.md for why.
          </p>
          {notificationsEnabled && permissionDenied && (
            <p className={styles.hint}>
              <AlertTriangle
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className={styles.hintIcon}
              />
              Browser notifications are blocked, so reminders will only show up inside the app
              itself (never as a system pop-up). Academic OS still works fully — you can allow
              notifications for this site in your browser's settings if you&rsquo;d like the pop-up
              too.
            </p>
          )}
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
          <button type="button" className={styles.row} onClick={() => navigate("/data/import")}>
            <Upload size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.rowLabel}>Import Semester</span>
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
          <p className={styles.value}>Academic OS · v1.0.0</p>
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
