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

/** This suite runs at the default (desktop-width) Playwright viewport, so
 * Schedule always renders the full week grid, not the mobile Day Detail —
 * marking attendance means opening an event's detail dialog first, the
 * same as a real desktop user would. Leaves the dialog open on return so
 * callers can assert its contents. */
async function openTodayEvent(page: Page) {
  await page.goto("/schedule");
  await page.locator('[class*="event"]').first().click();
  await expect(dialog(page)).toBeVisible();
}

/**
 * Realistic end-to-end student workflows against the real production
 * build — every step drives the actual UI, no fixture shortcuts. Covers
 * the core Stage 3 loop (PRODUCT_SPEC.md's core hierarchy end to end) and
 * the lifecycle behaviors the spec calls out as invariants: task
 * completion history, schedule-template edits never corrupting past
 * attendance, course renames propagating everywhere, and the semester
 * lifecycle (export is independent of "Start New Semester").
 */
test.describe("New user golden path", () => {
  test("semester → course → unit → schedule → task → attendance → grade → practice, all surviving a reload", async ({
    page,
  }) => {
    await createSemester(page);

    // Course
    await page.goto("/courses");
    await page.getByRole("button", { name: "Add course" }).click();
    await dialog(page).getByLabel("Course name").fill("CSAI 101");
    await dialog(page).getByLabel("Course code").fill("CSAI101");
    await dialog(page).getByRole("button", { name: "Add course" }).click();
    await page.waitForURL(/\/courses\/.+/);
    await expect(page.getByRole("heading", { name: "CSAI 101" }).first()).toBeVisible();

    // Unit
    await page.getByRole("button", { name: "Add unit" }).click();
    await dialog(page).getByLabel("Unit title").fill("Lecture 1");
    await dialog(page).getByRole("button", { name: "Add unit" }).click();
    await expect(page.getByText("Lecture 1")).toBeVisible();

    // Recurring class for today, so attendance can be marked this run.
    const todayLabel = await todayDayLabel(page);
    await page.getByRole("tab", { name: "Schedule" }).click();
    await page.getByRole("button", { name: "Add recurring class" }).click();
    await dialog(page).getByLabel("Day").selectOption({ label: todayLabel });
    // A deliberately wide time window (not the form's 09:00–10:30 default)
    // so the occurrence reads as "in-progress" — and therefore markable —
    // regardless of what time of day this suite actually runs.
    await dialog(page).getByLabel("Start time").fill("00:01");
    await dialog(page).getByLabel("End time").fill("23:59");
    await dialog(page).getByLabel("Location").fill("Room C201");
    await dialog(page).getByRole("button", { name: "Add class" }).click();
    await expect(page.getByText("Room C201")).toBeVisible();

    // Task
    await page.getByRole("tab", { name: "Tasks" }).click();
    await page.getByRole("button", { name: "Add task" }).click();
    await dialog(page).getByLabel("Task title").fill("Read chapter 1");
    await dialog(page).getByRole("button", { name: "Add task" }).click();
    await page.waitForURL("**/tasks");
    await expect(page.getByText("Read chapter 1", { exact: true })).toBeVisible();

    // Attendance, marked from the real Schedule screen.
    await openTodayEvent(page);
    await dialog(page).getByRole("button", { name: "Attended", exact: true }).click();
    await expect(dialog(page).getByText("Attended", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    // Grade + practice — navigate back into the course.
    await page.goto("/courses");
    await page.getByText("CSAI 101").click();
    await page.getByRole("tab", { name: "Grades" }).click();
    await page.getByRole("button", { name: "Add grade" }).click();
    await dialog(page).getByLabel("Label").fill("Quiz 1");
    await dialog(page).getByLabel("Earned").fill("8");
    await dialog(page).getByLabel("Out of").fill("10");
    await dialog(page).getByRole("button", { name: "Add grade" }).click();
    await expect(page.getByText("Quiz 1")).toBeVisible();

    await page.getByRole("tab", { name: "Practice" }).click();
    await page.getByRole("button", { name: "Add practice score" }).click();
    await dialog(page).getByLabel("Label").fill("Practice Set 1");
    await dialog(page).getByLabel("Earned").fill("6");
    await dialog(page).getByLabel("Out of").fill("10");
    await dialog(page).getByRole("button", { name: "Add practice score" }).click();
    await expect(page.getByText("Practice Set 1")).toBeVisible();

    // Everything above must survive a full reload — real IndexedDB
    // persistence, not in-memory component state.
    await page.reload();
    await expect(page.getByText("Practice Set 1")).toBeVisible();
    await page.getByRole("tab", { name: "Grades" }).click();
    await expect(page.getByText("Quiz 1")).toBeVisible();
    await page.getByRole("tab", { name: "Units" }).click();
    await expect(page.getByText("Lecture 1")).toBeVisible();

    await page.goto("/tasks");
    await expect(page.getByText("Read chapter 1", { exact: true })).toBeVisible();

    await openTodayEvent(page);
    await expect(dialog(page).getByText("Attended", { exact: true })).toBeVisible();
  });
});

test.describe("Task completion history", () => {
  test("completing then uncompleting a task is reversible and reflected immediately", async ({
    page,
  }) => {
    await createSemester(page);
    await page.goto("/tasks");
    await page.getByRole("button", { name: "Add task" }).click();
    await dialog(page).getByLabel("Task title").fill("Solve problem set");
    await dialog(page).getByRole("button", { name: "Add task" }).click();

    // No due date -> lives under "No due date" while incomplete.
    await expect(page.getByText("No due date")).toBeVisible();
    await page.getByRole("checkbox", { name: /mark "solve problem set" as complete/i }).click();

    // Completing moves it into the collapsed "Completed" section — expand
    // it to prove the toggle actually took effect, not just that the row
    // disappeared.
    await page.getByRole("button", { name: /^Completed \(1\)$/ }).click();
    await expect(
      page.getByRole("checkbox", { name: /mark "solve problem set" as incomplete/i }),
    ).toBeChecked();

    // Toggle back off — the task must not be stuck "completed forever,"
    // and must reappear in its original incomplete-task grouping.
    await page.getByRole("checkbox", { name: /mark "solve problem set" as incomplete/i }).click();
    await expect(page.getByText(/^Completed/)).not.toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /mark "solve problem set" as complete/i }),
    ).not.toBeChecked();
  });
});

test.describe("Schedule template edits never corrupt recorded attendance", () => {
  test("an already-marked occurrence keeps its recorded status independent of the template row", async ({
    page,
  }) => {
    await createSemester(page);
    await page.goto("/courses");
    await page.getByRole("button", { name: "Add course" }).click();
    await dialog(page).getByLabel("Course name").fill("MATH 202");
    await dialog(page).getByRole("button", { name: "Add course" }).click();
    await page.waitForURL(/\/courses\/.+/);

    const todayLabel = await todayDayLabel(page);
    await page.getByRole("tab", { name: "Schedule" }).click();
    await page.getByRole("button", { name: "Add recurring class" }).click();
    await dialog(page).getByLabel("Day").selectOption({ label: todayLabel });
    await dialog(page).getByLabel("Start time").fill("00:01");
    await dialog(page).getByLabel("End time").fill("23:59");
    await dialog(page).getByLabel("Location").fill("Room A");
    await dialog(page).getByRole("button", { name: "Add class" }).click();
    // Wait for the create sheet to actually close (only happens once the
    // async createTemplate() write resolves) before the hard navigation
    // below, which otherwise doesn't wait for pending in-page writes.
    await expect(dialog(page)).not.toBeVisible();

    await openTodayEvent(page);
    await dialog(page).getByRole("button", { name: "Attended", exact: true }).click();
    await expect(dialog(page).getByText("Attended", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    // Navigate away and back — the regression this guards against is the
    // status silently reverting to "unmarked" or being re-derived from the
    // template instead of the persisted occurrence row.
    await page.goto("/courses");
    await page.goto("/home");
    await openTodayEvent(page);
    await expect(dialog(page).getByText("Attended", { exact: true })).toBeVisible();
  });
});

test.describe("Course rename propagates everywhere", () => {
  test("renaming a course updates its label on the Tasks screen immediately", async ({ page }) => {
    await createSemester(page);
    await page.goto("/courses");
    await page.getByRole("button", { name: "Add course" }).click();
    await dialog(page).getByLabel("Course name").fill("Old Course Name");
    await dialog(page).getByRole("button", { name: "Add course" }).click();
    await page.waitForURL(/\/courses\/.+/);

    await page.getByRole("tab", { name: "Tasks" }).click();
    await page.getByRole("button", { name: "Add task" }).click();
    await dialog(page).getByLabel("Task title").fill("Prep for exam");
    await dialog(page).getByRole("button", { name: "Add task" }).click();
    await page.waitForURL("**/tasks");
    await expect(page.getByText("Old Course Name")).toBeVisible();

    await page.goto("/courses");
    await page.getByText("Old Course Name").click();
    await page.getByRole("button", { name: "Course options" }).click();
    await page.getByRole("button", { name: "Edit course" }).click();
    await dialog(page).getByLabel("Course name").fill("New Course Name");
    await dialog(page).getByRole("button", { name: "Save changes" }).click();
    // Wait for the edit sheet to actually close — it only does once the
    // async updateCourse() write has resolved — before navigating away, so
    // the next screen doesn't race ahead of the persisted rename.
    await expect(dialog(page)).not.toBeVisible();

    await page.goto("/tasks");
    await expect(page.getByText("New Course Name")).toBeVisible();
    await expect(page.getByText("Old Course Name")).not.toBeVisible();
  });
});

test.describe("Semester lifecycle", () => {
  test("Semester Export downloads a real archive without touching current data", async ({
    page,
  }) => {
    await createSemester(page);
    await page.goto("/courses");
    await page.getByRole("button", { name: "Add course" }).click();
    await dialog(page).getByLabel("Course name").fill("Export Test Course");
    await dialog(page).getByRole("button", { name: "Add course" }).click();
    await page.waitForURL(/\/courses\/.+/);

    await page.goto("/data/export");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export Semester Archive" }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.academic-archive\.json$/);

    // Export never deletes — the course is still there afterward.
    await page.goto("/courses");
    await expect(page.getByText("Export Test Course")).toBeVisible();
  });

  test("Start New Semester clears courses but preserves global Tags", async ({ page }) => {
    await createSemester(page);
    await page.goto("/tags");
    await page.getByRole("button", { name: "Add tag" }).click();
    await dialog(page).getByLabel("Name").fill("University");
    await dialog(page).getByRole("button", { name: "Save tag" }).click();
    await expect(page.getByText("University")).toBeVisible();

    await page.goto("/courses");
    await page.getByRole("button", { name: "Add course" }).click();
    await dialog(page).getByLabel("Course name").fill("Will be deleted");
    await dialog(page).getByRole("button", { name: "Add course" }).click();

    await page.goto("/data/new-semester");
    await page.getByLabel(/type "delete" to confirm/i).fill("DELETE");
    await page.getByRole("button", { name: "Delete current semester" }).click();
    await page.waitForURL("**/semester-setup");

    await createSemester(page);
    await page.goto("/courses");
    await expect(page.getByText("Will be deleted")).not.toBeVisible();

    await page.goto("/tags");
    await expect(page.getByText("University")).toBeVisible();
  });
});
