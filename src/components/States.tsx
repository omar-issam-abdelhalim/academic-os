import type { CSSProperties, ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/classNames";
import styles from "./States.module.css";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Used per STAGE_1A_UX_ARCHITECTURE.md §T's empty-state inventory — CTA
 * copy is supplied by the caller so tone stays specific to the screen
 * (never a generic "No data"). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <p className={styles.emptyTitle}>{title}</p>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {action}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Defensive per-item error surface — "This file couldn't be loaded" style
 * (STAGE_1A_UX_ARCHITECTURE.md §T) — never crashes the surrounding list. */
export function ErrorState({ title, description, action }: ErrorStateProps) {
  return (
    <div className={styles.error} role="alert">
      <p className={styles.errorTitle}>{title}</p>
      {description && <p className={styles.errorDescription}>{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn(styles.skeleton, className)} style={style} aria-hidden="true" />;
}

/** Global, non-blocking — "reassures full functionality remains available"
 * (STAGE_1A_UX_ARCHITECTURE.md §T); local-first means offline is never
 * catastrophic. */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className={styles.offline} role="status">
      <WifiOff size={14} strokeWidth={1.5} aria-hidden="true" />
      You&rsquo;re offline — Academic OS keeps working from your device.
    </div>
  );
}
