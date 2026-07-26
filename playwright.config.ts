import { defineConfig, devices } from "@playwright/test";

/**
 * Deterministic E2E/responsive/PWA verification — used specifically because
 * the interactive browser-automation tool available in this environment
 * could not reliably resize its viewport (confirmed during Stage 2: two very
 * different requested sizes produced byte-identical screenshots). Playwright
 * drives a real Chromium instance against the actual production build
 * (`vite preview`), so service worker/PWA behavior is real, not simulated.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4310",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --port 4310 --strictPort",
    url: "http://localhost:4310",
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
