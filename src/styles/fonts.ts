/**
 * Self-hosted fonts (via @fontsource), not Google Fonts at runtime.
 *
 * Stage 1B's fallback stack (STAGE_1B_DESIGN_SYSTEM.md §3) names Google
 * Fonts as the delivery mechanism; self-hosting the same three typefaces
 * is a Stage 2 implementation decision, not a typography-identity change:
 * it keeps the app fully functional offline (core PWA requirement,
 * PRODUCT_SPEC.md §21), avoids a third-party network request that would
 * otherwise need a CSP allowance (SECURITY.md §6), and removes a
 * dependency on an external host being reachable at all.
 *
 * Latin-subset files only (`latin-<weight>.css`, not the bare
 * `<weight>.css`, which bundles every Unicode range — Cyrillic, Greek,
 * Vietnamese, etc.) — the product has no current requirement for those
 * scripts, and pulling them in nearly quadrupled the font payload for no
 * benefit (Stage 2 §42 performance guidance: avoid oversized assets
 * without justification). Add more subsets later if real content needs
 * them.
 */
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
