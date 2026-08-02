import { Bell, X } from "lucide-react";
import { useClassReminders } from "@/features/shared/useClassReminders";
import styles from "./ClassReminderBanner.module.css";

/**
 * Notification engine baseline, Tier 1 (ARCHITECTURE.md §"Notifications —
 * platform constraints"): a non-blocking, dismissible in-app banner for a
 * class starting soon — works everywhere, no platform dependency. Mounted
 * once in AppShell so it's visible regardless of which screen is open,
 * matching PRODUCT_SPEC.md §9's "starting soon" reminder concept. Never
 * color-only (icon + text, per STAGE_1A_UX_ARCHITECTURE.md §U); `role="status"`
 * announces it without stealing focus, matching OfflineIndicator/UpdatePrompt.
 */
export function ClassReminderBanner() {
  const { activeReminder, dismiss } = useClassReminders();
  if (!activeReminder) return null;

  return (
    <div className={styles.banner} role="status">
      <Bell size={16} strokeWidth={1.5} className={styles.icon} aria-hidden="true" />
      <span className={styles.message}>{activeReminder.message}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss class reminder"
        onClick={dismiss}
      >
        <X size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
