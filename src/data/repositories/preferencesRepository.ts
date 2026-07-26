import { preferencesDb } from "@/data/db";
import { withStorageErrorHandling } from "@/data/storageErrors";
import type { AppPreferences } from "@/types/entities";

const DEFAULTS: AppPreferences = {
  id: "singleton",
  theme: "system",
  hasCompletedOnboarding: false,
};

export async function getPreferences(): Promise<AppPreferences> {
  return withStorageErrorHandling(async () => {
    const existing = await preferencesDb.appPreferences.get("singleton");
    return existing ?? DEFAULTS;
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
