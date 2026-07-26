import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components";
import styles from "./UpdatePrompt.module.css";

/**
 * The explicit "Update available — refresh to apply" banner
 * (ARCHITECTURE.md §PWA Strategy). `registerType: "prompt"` (vite.config.ts)
 * means the new service worker installs and waits — it is never activated
 * automatically. Refreshing only happens on the user's explicit click,
 * which is what keeps a background deploy from ever interrupting
 * in-progress data entry.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => {
      // A failed SW registration must never break the app — Academic OS
      // works (just without the offline/installable enhancements) even
      // if this fails, consistent with local-first not depending on any
      // one browser feature succeeding.
      console.error("Service worker registration failed", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className={styles.banner} role="status">
      <span>A new version of Academic OS is available.</span>
      <Button size="small" onClick={() => updateServiceWorker(true)}>
        Refresh to update
      </Button>
    </div>
  );
}
