import { test, expect } from "@playwright/test";
import { createSemester } from "./helpers";

test.describe("PWA — manifest, icons, service worker, offline shell", () => {
  test("manifest.webmanifest is valid and linked from the document", async ({ page, request }) => {
    await page.goto("/home");
    const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href");
    expect(manifestHref).toBeTruthy();

    const response = await request.get(manifestHref!);
    expect(response.status()).toBe(200);
    const manifest = await response.json();

    expect(manifest.name).toBe("Academic OS");
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const hasMaskable = manifest.icons.some(
      (icon: { purpose?: string }) => icon.purpose === "maskable",
    );
    expect(hasMaskable, "manifest must declare at least one maskable icon").toBe(true);
  });

  test("every icon referenced in the manifest resolves with 200", async ({ page, request }) => {
    await page.goto("/home");
    const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href");
    const manifest = await (await request.get(manifestHref!)).json();

    for (const icon of manifest.icons as { src: string }[]) {
      const res = await request.get(icon.src);
      expect(res.status(), `icon ${icon.src} should resolve`).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    }
  });

  test("service worker registers and reaches the 'activated' state", async ({ page }) => {
    await page.goto("/home");
    const state = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      // `ready` resolves as soon as `active` is set, which can still
      // momentarily read "activating" before the statechange event fires —
      // wait for the real terminal state rather than racing it.
      const worker = reg.active;
      if (!worker) return "none";
      if (worker.state === "activated") return "activated";
      return new Promise<string>((resolve) => {
        worker.addEventListener("statechange", () => resolve(worker.state), { once: true });
      });
    });
    expect(state).toBe("activated");
  });

  test("service worker precache does not include Dexie/IndexedDB data — only static app-shell assets", async ({
    page,
  }) => {
    await page.goto("/home");
    await page.evaluate(async () => navigator.serviceWorker.ready);
    const cacheKeys = await page.evaluate(async () => {
      const names = await caches.keys();
      const allUrls: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        allUrls.push(...requests.map((r) => r.url));
      }
      return allUrls;
    });
    // Every cached entry should be a static asset (JS/CSS/HTML/font/icon),
    // never anything that looks like an API/data endpoint — there are none
    // in this architecture, so this also guards against accidentally
    // introducing one that the SW then caches.
    for (const url of cacheKeys) {
      expect(url).not.toMatch(/\/api\//);
    }
  });

  test("app shell still renders after going offline (post-install)", async ({ page, context }) => {
    // First load online so the SW installs and precaches the shell.
    await createSemester(page);
    await page.goto("/home");
    await page.evaluate(async () => navigator.serviceWorker.ready);

    await context.setOffline(true);
    try {
      await page.reload();
      // The precached shell should render even with zero network access —
      // local-first means offline is informational, not catastrophic. This
      // is the real, meaningful assertion: full page content (nav, Home's
      // task list, etc.) renders with every network request blocked.
      //
      // Not asserted here: the <OfflineIndicator> banner's visibility.
      // `context.setOffline(true)` reliably blocks network requests (which
      // is what this test needs), but was confirmed (see debug run in
      // docs/STAGE_2_REPORT.md) to leave `navigator.onLine` reading `true`
      // in this Chromium/Playwright combination — a known environment
      // limitation, not a defect in the component (which correctly uses
      // the standard `navigator.onLine`/`online`/`offline` APIs). The
      // banner's correctness under a real network disconnect has not been
      // independently verified and is called out as such in the report.
      await expect(page.getByRole("heading", { name: "Home" })).toBeVisible({ timeout: 10_000 });
      // A fresh semester with no tasks/courses yet still renders real,
      // Dexie-backed content offline — the "Today" section heading and its
      // honest empty-state copy, not a network-dependent placeholder.
      await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
      await expect(page.getByText(/nothing due today/i)).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });

  test("Dexie-backed data (active semester) is still readable while offline", async ({
    page,
    context,
  }) => {
    await createSemester(page);
    await page.goto("/settings");
    await expect(page.getByText("Year 2 · Semester 1")).toBeVisible();
    // Wait for the service worker to actually control this page before
    // cutting the network — without this, a reload while offline can hit
    // net::ERR_INTERNET_DISCONNECTED outright (observed on CI/Linux)
    // instead of being served from precache, because there's nothing yet
    // intercepting the navigation request.
    await page.evaluate(async () => navigator.serviceWorker.ready);

    await context.setOffline(true);
    try {
      await page.reload();
      // Settings reads the semester from IndexedDB, not the network — this
      // must still work with the network fully cut off.
      await expect(page.getByText("Year 2 · Semester 1")).toBeVisible({ timeout: 10_000 });
    } finally {
      await context.setOffline(false);
    }
  });
});
