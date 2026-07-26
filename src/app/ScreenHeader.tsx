import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@/components";
import styles from "./ScreenHeader.module.css";

export interface ScreenHeaderProps {
  title: string;
  back?: boolean;
  action?: ReactNode;
}

/** One top app bar shape reused by every screen
 * (STAGE_1A_UX_ARCHITECTURE.md §C: "never more than one primary action in
 * the app bar"). */
export function ScreenHeader({ title, back, action }: ScreenHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={styles.header}>
      <div className={styles.titleGroup}>
        {back && (
          <IconButton aria-label="Back" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
        )}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </header>
  );
}
