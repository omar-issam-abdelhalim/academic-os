import { Image as ImageIcon, Video, File } from "lucide-react";
import { SafeMarkdown } from "@/lib/safeMarkdown";
import type { ContentBlock } from "@/types/entities";
import styles from "./ContentBlockCard.module.css";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ICONS = { file: File, image: ImageIcon, video: Video } as const;

/**
 * Renders a Content Block by type (STAGE_1A_UX_ARCHITECTURE.md §I): text
 * blocks show a rendered, sanitized preview — never raw Markdown source
 * or raw HTML; file/image/video blocks show title + type icon + size.
 * Actual blob preview/playback is Stage 3 (once the Blob store exists) —
 * this reference UI shows the metadata a user would see honestly, without
 * faking a file that isn't really stored yet.
 */
export function ContentBlockCard({ block }: { block: ContentBlock }) {
  if (block.type === "text") {
    return (
      <div className={styles.card}>
        <p className={styles.title}>{block.title}</p>
        <div className={styles.textPreview}>
          <SafeMarkdown source={block.content} />
        </div>
      </div>
    );
  }

  const Icon = ICONS[block.type];
  return (
    <button type="button" className={styles.fileCard}>
      <Icon size={20} strokeWidth={1.5} className={styles.fileIcon} aria-hidden="true" />
      <span className={styles.fileMeta}>
        <span className={styles.title}>{block.title}</span>
        <span className={styles.fileSub}>
          {block.mimeType} · {formatSize(block.sizeBytes)}
        </span>
      </span>
    </button>
  );
}
