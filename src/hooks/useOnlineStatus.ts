import { useSyncExternalStore } from "react";

/** Academic OS is local-first — offline is informational only, never
 * catastrophic (PRODUCT_SPEC.md §21, STAGE_1A_UX_ARCHITECTURE.md §T). */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
