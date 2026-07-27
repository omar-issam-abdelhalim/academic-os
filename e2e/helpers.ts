import { expect, type Page } from "@playwright/test";

/** Phone widths named in the finalization brief, plus one tablet and one
 * desktop width for reference. Heights are representative device heights,
 * not load-bearing for the overflow checks (which only look at width). */
export const VIEWPORTS = [
  { name: "phone-320", width: 320, height: 690 },
  { name: "phone-360", width: 360, height: 740 },
  { name: "phone-375", width: 375, height: 667 },
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
] as const;

export const MOBILE_VIEWPORTS = VIEWPORTS.filter((v) => v.width < 1024);
export const DESKTOP_VIEWPORTS = VIEWPORTS.filter((v) => v.width >= 1024);

/** Emulates `prefers-reduced-motion: reduce` — also a real check of the
 * app's reduced-motion support (src/styles/global.css collapses all
 * animation/transition durations under this media feature). Applied before
 * navigation so bounding-box assertions taken right after an element
 * appears don't race its entrance animation (e.g. the bottom sheet's
 * slide-up transition) and read a mid-animation position. */
export async function enableReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
}

/** Drives the real Semester Setup form — this is the same gate the app
 * itself enforces, not a shortcut, so every screen under test is reached
 * exactly the way a user would reach it. */
export async function createSemester(page: Page) {
  await enableReducedMotion(page);
  await page.goto("/semester-setup");
  await page.getByPlaceholder("Year 2").fill("Year 2");
  await page.getByPlaceholder("Semester 1").fill("Semester 1");
  await page.getByRole("button", { name: "Start semester" }).click();
  await page.waitForURL("**/home");
}

export interface SeededIds {
  courseAId: string;
  unitAId: string;
  courseBId: string;
}

/** All form overlays (Dialog and Sheet alike) render `role="dialog"` — the
 * dialog itself is used to scope submit-button clicks, since several
 * create flows reuse the trigger's own label as the submit button's label
 * (e.g. "Add grade" appears both as the toolbar trigger and the form's
 * submit button). */
function dialog(page: Page) {
  return page.getByRole("dialog");
}

/** Waits for a just-submitted create/edit sheet to actually close — it
 * only does once its async repository write has resolved — before the
 * caller performs a hard `page.goto`, which otherwise doesn't wait for
 * pending in-page writes and can race ahead of them. */
async function waitForSubmitToSettle(page: Page) {
  await expect(dialog(page)).not.toBeVisible();
}

/**
 * Seeds a realistic, representative semester through the *real* UI (every
 * click is the same path a student would take) — Stage 3 replaced Stage
 * 2's static fixture IDs with real Dexie data, so deep-linking E2E specs
 * to a fixed `course-csai101`-style slug no longer works. This drives:
 * Course A ("Machine Learning Specialization", a long name, Structured
 * Mode grades with one deliberately-incomplete category, a schedule
 * template for *today* so the schedule grid has something to show, one
 * task, one practice entry) and its unit ("Lecture 04 — Neural Networks",
 * a long title, one text content block); Course B ("Mathematics II",
 * Simple Mode grades). Returns the real ids so callers can build deep
 * links to Course/Unit Detail.
 */
export async function seedRepresentativeSemester(page: Page): Promise<SeededIds> {
  // --- Course A ---
  await page.goto("/courses");
  await page.getByRole("button", { name: "Add course" }).click();
  await dialog(page).getByLabel("Course name").fill("Machine Learning Specialization");
  await dialog(page).getByRole("button", { name: "Add course" }).click();
  await page.waitForURL(/\/courses\/.+/);
  const courseAId = new URL(page.url()).pathname.split("/").pop()!;

  // Unit A (long title) with a text content block.
  await page.getByRole("button", { name: "Add unit" }).click();
  await dialog(page).getByLabel("Unit title").fill("Lecture 04 — Neural Networks");
  await dialog(page).getByRole("button", { name: "Add unit" }).click();
  await page.getByText("Lecture 04 — Neural Networks").click();
  await page.waitForURL(/\/units\/.+/);
  const unitAId = new URL(page.url()).pathname.split("/").pop()!;

  await page.getByRole("button", { name: "Add content" }).click();
  await page.getByRole("button", { name: "Text" }).click();
  await dialog(page).getByLabel("Title").fill("Key Concepts");
  await dialog(page)
    .getByLabel("Content")
    .fill("# Backpropagation\n\nCore idea: **gradient descent**.");
  await dialog(page).getByRole("button", { name: "Add to unit" }).click();
  await waitForSubmitToSettle(page);

  // Structured Mode grades, with one category left deliberately incomplete.
  await page.goto(`/courses/${courseAId}?section=grades`);
  await page.getByRole("button", { name: "Add course structure" }).click();
  await dialog(page).getByLabel("Category name").fill("Coursework");
  await dialog(page).getByLabel("Max points").fill("60");
  await dialog(page).getByRole("button", { name: "Add category" }).click();
  await waitForSubmitToSettle(page);
  await page.getByRole("button", { name: "Add category" }).click();
  await dialog(page).getByLabel("Category name").fill("Final");
  await dialog(page).getByLabel("Max points").fill("40");
  await dialog(page).getByRole("button", { name: "Add category" }).click();
  await waitForSubmitToSettle(page);
  await page.getByRole("button", { name: "Add grade" }).click();
  await dialog(page).getByLabel("Label").fill("Quiz 1");
  await dialog(page).getByLabel("Earned").fill("8");
  await dialog(page).getByLabel("Out of").fill("10");
  await dialog(page).getByRole("button", { name: "Add grade" }).click();
  await waitForSubmitToSettle(page);

  // A schedule template for *today*, so the schedule grid/week has a real
  // occurrence to render and click during this test run.
  const todayLabel = await page.evaluate(() => {
    const labels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
    return labels[(new Date().getDay() + 1) % 7];
  });
  await page.goto(`/courses/${courseAId}?section=schedule`);
  await page.getByRole("button", { name: "Add recurring class" }).click();
  await dialog(page).getByLabel("Day").selectOption({ label: todayLabel! });
  // A deliberately wide window (not the form's 09:00–10:30 default) so the
  // occurrence reads as markable regardless of what time this suite runs.
  await dialog(page).getByLabel("Start time").fill("00:01");
  await dialog(page).getByLabel("End time").fill("23:59");
  await dialog(page).getByRole("button", { name: "Add class" }).click();
  await waitForSubmitToSettle(page);

  // A task and a practice entry for Course A.
  await page.goto(`/courses/${courseAId}?section=tasks`);
  await page.getByRole("button", { name: "Add task" }).click();
  await dialog(page).getByLabel("Task title").fill("Review lecture notes");
  await dialog(page).getByRole("button", { name: "Add task" }).click();
  await waitForSubmitToSettle(page);

  await page.goto(`/courses/${courseAId}?section=practice`);
  await page.getByRole("button", { name: "Add practice score" }).click();
  await dialog(page).getByLabel("Label").fill("Practice Set 1");
  await dialog(page).getByLabel("Earned").fill("7");
  await dialog(page).getByLabel("Out of").fill("10");
  await dialog(page).getByRole("button", { name: "Add practice score" }).click();
  await waitForSubmitToSettle(page);

  // --- Course B (Simple Mode grades) ---
  await page.goto("/courses");
  await page.getByRole("button", { name: "Add course" }).click();
  await dialog(page).getByLabel("Course name").fill("Mathematics II");
  await dialog(page).getByRole("button", { name: "Add course" }).click();
  await page.waitForURL(/\/courses\/.+/);
  const courseBId = new URL(page.url()).pathname.split("/").pop()!;

  await page.goto(`/courses/${courseBId}?section=grades`);
  await page.getByRole("button", { name: "Add grade" }).click();
  await dialog(page).getByLabel("Label").fill("Midterm");
  await dialog(page).getByLabel("Earned").fill("42");
  await dialog(page).getByLabel("Out of").fill("50");
  await dialog(page).getByRole("button", { name: "Add grade" }).click();
  await waitForSubmitToSettle(page);

  return { courseAId, unitAId, courseBId };
}

/** Every screen route in the Stage 1A inventory, reachable once a semester
 * (and, for Course/Unit-scoped screens, the seeded courses) exist. Paths
 * are functions of the seeded ids rather than static strings, since those
 * ids are real Dexie-generated ids, not fixed fixture slugs. */
export const SCREEN_ROUTES: { name: string; path: (ids: SeededIds) => string }[] = [
  { name: "Home", path: () => "/home" },
  { name: "Tasks", path: () => "/tasks" },
  { name: "Schedule", path: () => "/schedule" },
  { name: "Courses", path: () => "/courses" },
  { name: "Course Detail — Units", path: (ids) => `/courses/${ids.courseAId}` },
  { name: "Course Detail — Tasks", path: (ids) => `/courses/${ids.courseAId}?section=tasks` },
  { name: "Course Detail — Schedule", path: (ids) => `/courses/${ids.courseAId}?section=schedule` },
  {
    name: "Course Detail — Grades (Structured)",
    path: (ids) => `/courses/${ids.courseAId}?section=grades`,
  },
  {
    name: "Course Detail — Grades (Simple)",
    path: (ids) => `/courses/${ids.courseBId}?section=grades`,
  },
  { name: "Course Detail — Practice", path: (ids) => `/courses/${ids.courseAId}?section=practice` },
  { name: "Unit Detail", path: (ids) => `/courses/${ids.courseAId}/units/${ids.unitAId}` },
  { name: "Performance", path: () => "/performance" },
  { name: "Settings", path: () => "/settings" },
  { name: "Tags", path: () => "/tags" },
  { name: "Semester End", path: () => "/data/export" },
  { name: "Start New Semester", path: () => "/data/new-semester" },
  { name: "More", path: () => "/more" },
];

/** Waits two animation frames — the deterministic way to let layout/paint
 * settle after a state-driven DOM change before measuring geometry, without
 * tying the wait to an arbitrary timeout or to CSS animation duration
 * (reduced-motion is already enabled repo-wide for this test run). */
export async function waitForLayoutSettle(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

/** Horizontal-overflow check: the single strongest automated signal for
 * "content is clipped / spills past the viewport / a fixed-width element
 * breaks the layout" at a given width. */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1; // +1px rounding tolerance
  });
}
