import { describe, expect, it, beforeEach } from "vitest";
import { preferencesDb } from "@/data/db";
import { getPreferences, updatePreferences } from "./preferencesRepository";

beforeEach(async () => {
  await preferencesDb.delete();
  await preferencesDb.open();
});

describe("preferencesRepository", () => {
  it("returns sensible defaults when nothing is stored yet", async () => {
    const prefs = await getPreferences();
    expect(prefs.theme).toBe("system");
    expect(prefs.hasCompletedOnboarding).toBe(false);
  });

  it("persists a theme change across reads", async () => {
    await updatePreferences({ theme: "dark" });
    expect((await getPreferences()).theme).toBe("dark");
  });

  it("preserves unrelated fields when patching one field", async () => {
    await updatePreferences({ hasCompletedOnboarding: true });
    await updatePreferences({ theme: "light" });
    const prefs = await getPreferences();
    expect(prefs.theme).toBe("light");
    expect(prefs.hasCompletedOnboarding).toBe(true);
  });
});
