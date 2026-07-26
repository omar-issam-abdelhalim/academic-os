/**
 * Stable client-generated IDs (DATA_MODEL.md §"Referential Integrity":
 * "IDs are stable, generated client-side ... at creation time and never
 * reused"). Uses the Web Crypto API available in all supported browsers
 * and in Node's test environment (jsdom polyfills it).
 */
export function createId(): string {
  return crypto.randomUUID();
}
