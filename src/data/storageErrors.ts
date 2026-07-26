/**
 * Storage-failure awareness (Stage 2 §30): a small, consistent way to
 * classify and surface IndexedDB/Dexie failures instead of letting them
 * fail silently. This is infrastructure — Stage 2 does not need a final
 * recovery UI for every case, but no repository call should be able to
 * fail without the caller knowing *what kind* of failure occurred.
 */
import Dexie from "dexie";

export type StorageErrorKind = "quota-exceeded" | "blocked" | "version-conflict" | "unknown";

export class StorageError extends Error {
  readonly kind: StorageErrorKind;
  readonly cause?: unknown;

  constructor(kind: StorageErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.kind = kind;
    this.cause = cause;
  }
}

function classify(error: unknown): StorageErrorKind {
  if (error instanceof DOMException) {
    if (error.name === "QuotaExceededError") return "quota-exceeded";
  }
  if (error instanceof Dexie.DexieError) {
    if (error.name === "QuotaExceededError") return "quota-exceeded";
    if (error.name === "VersionError" || error.name === "UpgradeError") return "version-conflict";
  }
  if (error instanceof Error && /blocked/i.test(error.message)) return "blocked";
  return "unknown";
}

const MESSAGES: Record<StorageErrorKind, string> = {
  "quota-exceeded":
    "Your device is out of storage space for Academic OS. Free up space, or export your semester as a backup before continuing.",
  blocked:
    "Academic OS couldn't access its local database — try closing other tabs with this app open.",
  "version-conflict":
    "Academic OS's local database is out of date. Reload the app to apply the update.",
  unknown: "Something went wrong saving your data locally. Please try again.",
};

/** Wraps a Dexie/IndexedDB operation, normalizing failures into a StorageError
 * with a user-safe message — never lets a raw DOM/Dexie exception escape
 * to the UI unclassified. */
export async function withStorageErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const kind = classify(error);
    throw new StorageError(kind, MESSAGES[kind], error);
  }
}
