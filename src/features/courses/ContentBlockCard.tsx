import { Image as ImageIcon, Video, File, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/components";
import { SafeMarkdown } from "@/lib/safeMarkdown";
import { useBlobUrl } from "@/features/shared/useBlobUrl";
import type { ContentBlock } from "@/types/entities";
import styles from "./ContentBlockCard.module.css";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ICONS = { file: File, image: ImageIcon, video: Video } as const;

export interface ContentBlockCardProps {
  block: ContentBlock;
  onEdit?: (block: ContentBlock) => void;
  onDelete?: (block: ContentBlock) => void;
}

/**
 * Renders a Content Block by type (STAGE_1A_UX_ARCHITECTURE.md §I): text
 * blocks show a rendered, sanitized preview — never raw Markdown source or
 * raw HTML (SECURITY.md §1); image/video blocks render the real stored
 * Blob via an object URL; file blocks show title + type icon + size, with
 * a real download link to the stored Blob.
 */
export function ContentBlockCard({ block, onEdit, onDelete }: ContentBlockCardProps) {
  const blobUrl = useBlobUrl(block.type !== "text" ? block.blobId : undefined);

  if (block.type === "text") {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.title}>{block.title}</p>
          <div className={styles.cardActions}>
            {onEdit && (
              <IconButton
                aria-label={`Edit ${block.title}`}
                size="small"
                onClick={() => onEdit(block)}
              >
                <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
              </IconButton>
            )}
            {onDelete && (
              <IconButton
                aria-label={`Delete ${block.title}`}
                size="small"
                onClick={() => onDelete(block)}
              >
                <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
              </IconButton>
            )}
          </div>
        </div>
        <div className={styles.textPreview}>
          <SafeMarkdown source={block.content} />
        </div>
      </div>
    );
  }

  const Icon = ICONS[block.type];

  return (
    <div className={styles.fileCard}>
      <div className={styles.fileMain}>
        <Icon size={20} strokeWidth={1.5} className={styles.fileIcon} aria-hidden="true" />
        <span className={styles.fileMeta}>
          <span className={styles.title}>{block.title}</span>
          <span className={styles.fileSub}>
            {block.mimeType} · {formatSize(block.sizeBytes)}
          </span>
        </span>
      </div>
      {block.type === "image" && blobUrl && (
        <img src={blobUrl} alt={block.title} className={styles.imagePreview} />
      )}
      {block.type === "video" && blobUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption -- user-uploaded personal media has no caption track to attach.
        <video src={blobUrl} controls className={styles.videoPreview} />
      )}
      <div className={styles.fileActions}>
        {blobUrl && (
          <a href={blobUrl} download={block.originalFileName} className={styles.downloadLink}>
            Download
          </a>
        )}
        {onDelete && (
          <IconButton
            aria-label={`Delete ${block.title}`}
            size="small"
            onClick={() => onDelete(block)}
          >
            <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        )}
      </div>
    </div>
  );
}
