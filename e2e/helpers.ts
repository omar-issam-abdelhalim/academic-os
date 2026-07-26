import type { Page } from "@playwright/test";

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

/** Every screen route in the Stage 1A inventory, reachable once a semester
 * exists (Settings is reachable either way, per §S). */
export const SCREEN_ROUTES: { name: string; path: string }[] = [
  { name: "Home", path: "/home" },
  { name: "Tasks", path: "/tasks" },
  { name: "Schedule", path: "/schedule" },
  { name: "Courses", path: "/courses" },
  { name: "Course Detail — Units", path: "/courses/course-csai101" },
  { name: "Course Detail — Tasks", path: "/courses/course-csai101?section=tasks" },
  { name: "Course Detail — Schedule", path: "/courses/course-csai101?section=schedule" },
  { name: "Course Detail — Grades (Structured)", path: "/courses/course-csai101?section=grades" },
  { name: "Course Detail — Grades (Simple)", path: "/courses/course-math2?section=grades" },
  { name: "Course Detail — Practice", path: "/courses/course-csai101?section=practice" },
  { name: "Unit Detail", path: "/courses/course-csai101/units/unit-csai-l4" },
  { name: "Performance", path: "/performance" },
  { name: "Settings", path: "/settings" },
  { name: "Tags", path: "/tags" },
  { name: "Semester End", path: "/data/export" },
  { name: "Start New Semester", path: "/data/new-semester" },
  { name: "More", path: "/more" },
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
