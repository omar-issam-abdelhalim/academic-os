import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createSemester } from "./helpers";

test.describe("Keyboard navigation & focus", () => {
  test("desktop sidebar links are reachable and activatable by keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createSemester(page);
    await page.goto("/home");

    // Tab from the top of the document until the "Tasks" sidebar link is
    // focused, then activate it with the keyboard (no mouse at all).
    let focused = "";
    for (let i = 0; i < 15 && focused !== "Tasks"; i++) {
      await page.keyboard.press("Tab");
      focused = (await page.evaluate(() => document.activeElement?.textContent?.trim())) ?? "";
    }
    expect(focused).toBe("Tasks");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/tasks");
  });

  test("focus-visible ring is applied to the focused element", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createSemester(page);
    await page.goto("/home");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return getComputedStyle(el).outlineStyle;
    });
    expect(outline).not.toBe("none");
  });

  test("dialog: focus is trapped, Escape closes it, and focus returns to the trigger", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createSemester(page);
    await page.goto("/tags");
    const trigger = page.getByRole("button", { name: "Add tag" });
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Tab repeatedly — focus must never leave the dialog while it's open.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const withinDialog = await page.evaluate(() => {
        const active = document.activeElement;
        const dialogEl = document.querySelector('[role="dialog"]');
        return Boolean(dialogEl && active && dialogEl.contains(active));
      });
      expect(withinDialog, `focus escaped the dialog on Tab press #${i + 1}`).toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    // The trigger is an icon-only IconButton — its accessible name lives in
    // aria-label, not textContent (which is legitimately empty for an
    // icon-only control), so that's what focus restoration is checked against.
    const restored = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
    expect(restored).toBe("Add tag");
  });

  test("no keyboard trap on a plain screen (Tab keeps moving focus forward)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createSemester(page);
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    // A fresh navigation with no intervening click/action can leave the
    // document without logical keyboard focus for a brief moment — without
    // this wait, Tab presses land on nothing and activeElement stays
    // <body> throughout, which would (wrongly) look identical to a real
    // keyboard trap. Confirmed by direct reproduction during this pass.
    // Tag each focused *node* (not a text-derived label, which several
    // distinct icon-only/empty-text controls can share) with a marker
    // attribute the first time it's seen, so the count reflects actual DOM
    // node identity rather than colliding on identical-looking labels.
    await page.evaluate(() => {
      (window as unknown as { __seenCount: number }).__seenCount = 0;
    });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        const w = window as unknown as { __seenCount: number };
        if (el && !el.hasAttribute("data-e2e-tab-seen")) {
          el.setAttribute("data-e2e-tab-seen", "1");
          w.__seenCount += 1;
        }
      });
    }
    const distinctNodesFocused = await page.evaluate(
      () => (window as unknown as { __seenCount: number }).__seenCount,
    );
    // If focus were trapped on one element, every Tab press would re-focus
    // the same node and this count would stay at 1.
    expect(distinctNodesFocused).toBeGreaterThan(1);
  });
});

test.describe("Accessible names on icon-only controls", () => {
  test("every button on Home has an accessible name", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await createSemester(page);
    await page.goto("/home");
    const buttons = await page.getByRole("button").all();
    for (const button of buttons) {
      const name = await button.evaluate(
        (el) => el.getAttribute("aria-label") || el.textContent?.trim(),
      );
      expect(name, "every button must have a visible label or aria-label").toBeTruthy();
    }
  });
});

test.describe("Automated accessibility scan (axe-core) — spot check, not a full audit", () => {
  const pages = [
    { name: "Home", path: "/home" },
    { name: "Courses", path: "/courses" },
    { name: "Settings", path: "/settings" },
    { name: "Tags", path: "/tags" },
  ];

  for (const p of pages) {
    test(`${p.name} has no critical/serious automated a11y violations`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await createSemester(page);
      await page.goto(p.path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).analyze();
      const serious = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      if (serious.length > 0) {
        console.log(`${p.name} a11y violations:`, JSON.stringify(serious, null, 2));
      }
      expect(serious, `${p.name} has critical/serious axe violations`).toEqual([]);
    });
  }
});
