/**
 * JS-side source of truth for the breakpoints defined as CSS custom
 * properties in src/styles/tokens.css (kept in sync manually — CSS custom
 * properties can't be read into media-query logic directly).
 * See docs/STAGE_1B_DESIGN_SYSTEM.md §10.
 */
export const BREAKPOINTS = {
  tablet: 600,
  desktop: 1024,
  wide: 1440,
} as const;
