/**
 * GitHub Pages project sites have no server-side rewrite: a direct or
 * refreshed navigation to a deep route (e.g. /academic-os/tasks) is not a
 * real file, so GitHub Pages serves `public/404.html` instead of the SPA.
 * That page re-encodes the intended path into a `?p=` query string on the
 * app root and redirects there. This restores the real URL via
 * `history.replaceState` — before React Router reads `location` — so the
 * user lands on the route they actually requested, and BrowserRouter's
 * normal clean-URL behavior is otherwise untouched. See
 * docs/ARCHITECTURE.md — Hosting & Deployment.
 *
 * Must be imported before <App /> mounts (see src/main.tsx). No-op when
 * there is nothing to restore (i.e. every non-GitHub-Pages load).
 */
const restored = new URLSearchParams(window.location.search).get("p");
if (restored !== null) {
  window.history.replaceState(null, "", import.meta.env.BASE_URL + restored);
}
