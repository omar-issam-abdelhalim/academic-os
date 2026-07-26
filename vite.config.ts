/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// GitHub Pages serves this as a project site (docs/ARCHITECTURE.md — Hosting
// & Deployment), i.e. under a repository subpath, not the domain root.
// VITE_BASE_PATH is set only by the GitHub Pages deploy job
// (.github/workflows/ci.yml), derived there from the actual repository name
// (GITHUB_REPOSITORY) — never hardcoded here. Local dev/build/preview and
// the CI quality-gate job all run without it, so they keep resolving to "/"
// exactly as before this migration.
const base = process.env.VITE_BASE_PATH ?? "/";

// See docs/ARCHITECTURE.md §PWA Strategy for the update-flow rationale
// (registerType: "prompt" — never silently swap the app mid-session).
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      includeAssets: ["icons/icon-16.png", "icons/icon-32.png", "icons/icon-180.png"],
      manifest: {
        // start_url/scope/id are deliberately omitted — vite-plugin-pwa
        // derives all three from `base` above, so the manifest is correct
        // whether this is a "/" (dev/preview) or "/<repo>/" (GitHub Pages
        // production) build. Icon `src` values below are base-relative
        // (no leading slash) for the same reason: they resolve against the
        // manifest's own URL, not the document root.
        name: "Academic OS",
        short_name: "Academic OS",
        description:
          "A local-first personal academic operating system for courses, tasks, schedule, attendance, grades, and practice performance.",
        display: "standalone",
        background_color: "#fafaf7",
        theme_color: "#2b4c7e",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the app shell only. IndexedDB (Dexie) remains the sole
        // store for user academic data — see docs/DATA_MODEL.md and
        // docs/SECURITY.md §5; the service worker never caches API
        // responses (there are none) or user-generated blobs.
        globPatterns: ["**/*.{js,css,html,woff2}"],
        navigateFallbackDenylist: [new RegExp(`^${base}icons/`)],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // Vitest's default include glob (**/*.{test,spec}.*) also matches the
    // Playwright specs under e2e/ — those run only via `npm run test:e2e`
    // (a real browser, not jsdom) and import Playwright's own `test`
    // global, which conflicts with Vitest's if picked up here.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
