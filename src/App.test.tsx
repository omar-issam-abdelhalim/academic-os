import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App";
import { semesterDb, preferencesDb } from "@/data/db";

beforeEach(async () => {
  await semesterDb.delete();
  await semesterDb.open();
  await preferencesDb.delete();
  await preferencesDb.open();
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("gates to Semester Setup when no active semester exists (real Dexie check, not simulated)", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: /set up your semester/i }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });
});
