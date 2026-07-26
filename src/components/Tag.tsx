import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/classNames";
import type { TagColor } from "@/types/entities";
import styles from "./Tag.module.css";

export interface TagChipProps {
  label: string;
  color: TagColor;
  onRemove?: () => void;
  removeLabel?: string;
}

/** Radius/pill is reserved for tags/chips/filters only
 * (STAGE_1B_DESIGN_SYSTEM.md §6) — color is always paired with the name
 * label, never the sole carrier of meaning (PRODUCT_SPEC.md §2). */
export function TagChip({ label, color, onRemove, removeLabel }: TagChipProps) {
  return (
    <span className={styles.chip} data-tag-color={color}>
      {label}
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove ${label} tag`}
        >
          <X size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusBadgeProps {
  tone: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Status is always paired with text (and usually an icon) — never
 * color-only (STAGE_1A_UX_ARCHITECTURE.md §U). */
export function StatusBadge({ tone, icon, children, className }: StatusBadgeProps) {
  return (
    <span className={cn(styles.badge, styles[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
