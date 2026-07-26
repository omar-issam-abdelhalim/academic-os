import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// vite-plugin-pwa's virtual module is only registered during an actual
// Vite build/dev run (devOptions.enabled: false in vite.config.ts skips
// it otherwise) — it doesn't exist for Vitest's transform pipeline, so
// UpdatePrompt's import needs a stand-in here.
vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  }),
}));

// jsdom doesn't implement matchMedia — provide a minimal stub so
// useMediaQuery/useIsDesktop-based components don't crash in tests.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
