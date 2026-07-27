import { preferencesDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import type { AppPreferences } from "@/types/entities";

const DEFAULTS: AppPreferences = {
  id: "singleton",
  theme: "system",
  hasCompletedOnboarding: false,
  notificationsEnabled: true,
};

/** Merges stored preferences over the current defaults rather than
 * returning a stored record verbatim — a record written before a field was
 * added (e.g. `notificationsEnabled`, introduced in Stage 3) must not read
 * back as `undefined`. */
export async function getPreferences(): Promise<AppPreferences> {
  return withStorageErrorHandling(async () => {
    const existing = await preferencesDb.appPreferences.get("singleton");
    return existing ? { ...DEFAULTS, ...existing } : DEFAULTS;
  });
}

export async function updatePreferences(
  patch: Partial<Omit<AppPreferences, "id">>,
): Promise<AppPreferences> {
  return withStorageErrorHandling(async () => {
    const current = await getPreferences();
    const next: AppPreferences = { ...current, ...patch, id: "singleton" };
    await preferencesDb.appPreferences.put(next);
    return next;
  });
}
