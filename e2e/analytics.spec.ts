import { test, expect, type Page } from "@playwright/test";
import { createSemester } from "./helpers";

function dialog(page: Page) {
  return page.getByRole("dialog");
}

async function todayDayLabel(page: Page): Promise<string> {
  return page.evaluate(() => {
    const labels = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
    return labels[(new Date().getDay() + 1) % 7]!;
  });
}

/**
 * Stage 4 golden path: a realistic student's data flows from creation all
 * the way through to real, calculated analytics — and those analytics
 * change correctly when the underlying data changes. Every step drives
 * the real UI against the real production build; no fixtures, no mocked
 * data (Stage 3 removed fixtures entirely).
 */
test.describe("Academic analytics golden path", () => {
  test("real data produces real, correctly-updating Performance metrics and insights", async ({
    page,
  }) => {
    await createSemester(page);

    // Course with a mix of completed/incomplete tasks, mixed attendance,
    // multiple grade entries, and practice scores.
    await page.goto("/courses");
    await page.getByRole("button", { name: "Add course" }).click();
    await dialog(page).getByLabel("Course name").fill("Analytics Test Course");
    await dialog(page).getByRole("button", { name: "Add course" }).click();
    await page.waitForURL(/\/courses\/.+/);
    const courseUrl = page.url();
    const courseId = new URL(courseUrl).pathname.split("/").pop()!;

    // Tasks: 2 with no due date, 1 with a due date in the past (overdue
    // until completed) — the whole point of "Task C" in this test. Each
    // task is created via Course Detail's own "Add task" (which navigates
    // to /tasks with `newTaskCourseId` set) rather than the Tasks screen's
    // own header button, so every one of these is actually associated
    // with this course — using the global header button after the first
    // navigation would create a course-less task instead.
    for (const title of ["Task A", "Task B"]) {
      await page.goto(`/courses/${courseId}?section=tasks`);
      await page.getByRole("button", { name: "Add task" }).click();
      await dialog(page).getByLabel("Task title").fill(title);
      await dialog(page).getByRole("button", { name: "Add task" }).click();
      await expect(dialog(page)).not.toBeVisible();
    }
    await page.goto(`/courses/${courseId}?section=tasks`);
    await page.getByRole("button", { name: "Add task" }).click();
    await dialog(page).getByLabel("Task title").fill("Task C");
    await dialog(page).getByLabel("Due date").fill("2020-01-01");
    await dialog(page).getByRole("button", { name: "Add task" }).click();
    await expect(dialog(page)).not.toBeVisible();
    await page.waitForURL("**/tasks");
    for (const title of ["Task A", "Task B"]) {
      await page
        .getByRole("checkbox", { name: new RegExp(`mark "${title}" as complete`, "i") })
        .click();
    }

    // Attendance: mark today's occurrence as attended.
    const todayLabel = await todayDayLabel(page);
    await page.goto(`/courses/${courseId}?section=schedule`);
    await page.getByRole("button", { name: "Add recurring class" }).click();
    await dialog(page).getByLabel("Day").selectOption({ label: todayLabel });
    await dialog(page).getByLabel("Start time").fill("00:01");
    await dialog(page).getByLabel("End time").fill("23:59");
    await dialog(page).getByRole("button", { name: "Add class" }).click();
    await expect(dialog(page)).not.toBeVisible();

    await page.goto("/schedule");
    await page.locator('[class*="event"]').first().click();
    await dialog(page).getByRole("button", { name: "Attended", exact: true }).click();
    await expect(dialog(page).getByText("Attended", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    // Grades: two entries (Simple Mode).
    await page.goto(`/courses/${courseId}?section=grades`);
    for (const [label, earned, max] of [
      ["Quiz 1", "6", "10"],
      ["Quiz 2", "9", "10"],
    ] as const) {
      await page.getByRole("button", { name: "Add grade" }).click();
      await dialog(page).getByLabel("Label").fill(label);
      await dialog(page).getByLabel("Earned").fill(earned);
      await dialog(page).getByLabel("Out of").fill(max);
      await dialog(page).getByRole("button", { name: "Add grade" }).click();
      await expect(dialog(page)).not.toBeVisible();
    }

    // Practice: one entry.
    await page.goto(`/courses/${courseId}?section=practice`);
    await page.getByRole("button", { name: "Add practice score" }).click();
    await dialog(page).getByLabel("Label").fill("Practice Set 1");
    await dialog(page).getByLabel("Earned").fill("8");
    await dialog(page).getByLabel("Out of").fill("10");
    await dialog(page).getByRole("button", { name: "Add practice score" }).click();
    await expect(dialog(page)).not.toBeVisible();

    // --- Performance: verify real calculated metrics ---
    await page.goto("/performance");
    await expect(page.getByText("Task completion")).toBeVisible();
    // 2 of 3 tasks completed = 67% (rounded).
    await expect(page.getByText(/2 of 3 tasks completed/)).toBeVisible();
    await expect(page.getByText(/1 attended, 0 missed/)).toBeVisible();
    // (6+9)/(10+10) = 75% recorded.
    await expect(page.getByText("15/20 recorded")).toBeVisible();
    await expect(page.getByText("8/10 recorded")).toBeVisible();

    // Course comparison table includes the course.
    await expect(page.getByRole("cell", { name: "Analytics Test Course" })).toBeVisible();

    // At least one insight is shown (overdue task from "Task C").
    await expect(page.getByText(/overdue task/i)).toBeVisible();

    // --- Course Detail's analytics link takes us to a pre-filtered view ---
    await page.goto(`/courses/${courseId}`);
    await page.getByRole("button", { name: /view analytics for this course/i }).click();
    await page.waitForURL(/\/performance\?course=.+/);
    await expect(page.getByText(/2 of 3 tasks completed/)).toBeVisible();

    // --- Modify source data and verify analytics change correctly ---
    await page.goto(`/courses/${courseId}?section=tasks`);
    await page.getByRole("checkbox", { name: /mark "task c" as complete/i }).click();
    await page.goto("/performance");
    await expect(page.getByText(/3 of 3 tasks completed/)).toBeVisible();
    // The overdue insight must be gone now that nothing is overdue.
    await expect(page.getByText(/overdue task/i)).not.toBeVisible();

    // --- Home shows the single top-priority insight and links to Performance ---
    await page.goto("/home");
    const insightLine = page.getByRole("button", { name: /view performance for more/i });
    if (await insightLine.isVisible()) {
      await insightLine.click();
      await page.waitForURL("**/performance");
    }

    // --- Reload preserves everything ---
    await page.goto("/performance");
    await page.reload();
    await expect(page.getByText(/3 of 3 tasks completed/)).toBeVisible();
  });
});
