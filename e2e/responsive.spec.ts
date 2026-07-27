import { test, expect } from "@playwright/test";
import {
  VIEWPORTS,
  MOBILE_VIEWPORTS,
  DESKTOP_VIEWPORTS,
  SCREEN_ROUTES,
  createSemester,
  seedRepresentativeSemester,
  hasHorizontalOverflow,
  waitForLayoutSettle,
  type SeededIds,
} from "./helpers";

test.describe("Responsive — no horizontal overflow at any screen × viewport", () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}×${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      let seeded: SeededIds;
      test.beforeEach(async ({ page }) => {
        await createSemester(page);
        seeded = await seedRepresentativeSemester(page);
      });

      for (const screen of SCREEN_ROUTES) {
        test(`${screen.name} has no horizontal overflow`, async ({ page }) => {
          await page.goto(screen.path(seeded));
          await page.waitForLoadState("networkidle");
          expect(
            await hasHorizontalOverflow(page),
            `${screen.name} overflows at ${viewport.width}px`,
          ).toBe(false);
        });
      }
    });
  }
});

test.describe("Mobile navigation shell", () => {
  for (const viewport of MOBILE_VIEWPORTS) {
    test(`${viewport.name}: bottom nav is visible with ≥44px touch targets, sidebar is not shown`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createSemester(page);
      const nav = page.getByRole("navigation", { name: "Primary" });
      await expect(nav).toBeVisible();

      const links = await nav.getByRole("link").all();
      expect(links.length).toBe(5); // Home, Tasks, Schedule, Courses, More
      for (const link of links) {
        const box = await link.boundingBox();
        expect(box, "nav item must have a bounding box").not.toBeNull();
        expect(
          box!.height,
          "bottom nav item must meet the 44px touch-target minimum",
        ).toBeGreaterThanOrEqual(44);
      }

      // The desktop sidebar's wordmark/Command Palette hint must not render on mobile.
      await expect(page.getByText("Quick navigate")).toHaveCount(0);
    });
  }
});

test.describe("Desktop navigation shell", () => {
  for (const viewport of DESKTOP_VIEWPORTS) {
    test(`${viewport.name}: sidebar is visible, bottom nav is not shown`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createSemester(page);
      await expect(page.getByText("Quick navigate")).toBeVisible();

      const bottomNavItems = page.getByRole("navigation", { name: "Primary" }).getByText("More");
      await expect(bottomNavItems).toHaveCount(0);
    });
  }
});

test.describe("Dialogs stay within the viewport", () => {
  for (const viewport of [...MOBILE_VIEWPORTS, ...DESKTOP_VIEWPORTS]) {
    test(`${viewport.name}: Tags "New tag" overlay fits on screen`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await createSemester(page);
      await page.goto("/tags");
      await page.getByRole("button", { name: "Add tag" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await waitForLayoutSettle(page);
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      // A 2px tolerance absorbs legitimate sub-pixel layout rounding
      // (confirmed present here — measured overflow shrank from double
      // digits to <1.3px once animation-timing races were eliminated) while
      // still catching any real multi-pixel-or-larger overflow defect.
      const tolerance = 2;
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + tolerance);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + tolerance);
    });
  }

  test("desktop: Schedule grid event detail dialog fits on screen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createSemester(page);
    await seedRepresentativeSemester(page); // includes a template for "today"
    await page.goto("/schedule");
    await page.locator('[class*="event"]').first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await waitForLayoutSettle(page);
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x + box!.width).toBeLessThanOrEqual(1441);
  });
});

test.describe("Long content does not break layout", () => {
  test("Courses grid: a long real course name does not overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 690 });
    await createSemester(page);
    await seedRepresentativeSemester(page);
    await page.goto("/courses");
    await expect(page.getByText("Machine Learning Specialization")).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test("Unit Detail: a long real unit title does not overflow at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 690 });
    await createSemester(page);
    const seeded = await seedRepresentativeSemester(page);
    await page.goto(`/courses/${seeded.courseAId}/units/${seeded.unitAId}`);
    await expect(page.getByText("Lecture 04 — Neural Networks")).toBeVisible();
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});
