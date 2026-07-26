/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// See docs/ARCHITECTURE.md §PWA Strategy for the update-flow rationale
// (registerType: "prompt" — never silently swap the app mid-session).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      includeAssets: ["icons/icon-16.png", "icons/icon-32.png", "icons/icon-180.png"],
      manifest: {
        id: "/",
        name: "Academic OS",
        short_name: "Academic OS",
        description:
          "A local-first personal academic operating system for courses, tasks, schedule, attendance, grades, and practice performance.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#fafaf7",
        theme_color: "#2b4c7e",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
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
        navigateFallbackDenylist: [/^\/icons\//],
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
  },
});
