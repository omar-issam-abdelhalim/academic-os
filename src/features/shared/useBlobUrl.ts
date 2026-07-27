import { useEffect, useState } from "react";
import { getBlob } from "@/data/repositories/contentBlockRepository";

/**
 * Resolves a stored Blob to a local object URL for rendering
 * (SECURITY.md §2: files are served as opaque Blobs via
 * `URL.createObjectURL`, never executed/interpreted). The URL is revoked
 * on unmount/blobId change so it never leaks a handle.
 */
export function useBlobUrl(blobId: string | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blobId) return;
    let cancelled = false;
    let objectUrl: string | undefined;
    getBlob(blobId).then((stored) => {
      if (cancelled || !stored) return;
      objectUrl = URL.createObjectURL(stored.data);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobId]);

  return url;
}
