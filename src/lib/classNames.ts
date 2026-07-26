export type ClassValue = string | number | false | null | undefined;

/** Minimal `clsx`-style joiner — not worth a dependency for one function. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
