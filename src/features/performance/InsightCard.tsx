import { AlertCircle, Info, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components";
import type { Insight } from "@/domain/analytics/insights";
import styles from "./InsightCard.module.css";

const SEVERITY_ICON = { attention: AlertCircle, positive: TrendingUp, info: Info } as const;
const SEVERITY_TONE = { attention: "warning", positive: "success", info: "info" } as const;
const SEVERITY_LABEL = {
  attention: "Needs attention",
  positive: "Positive",
  info: "Info",
} as const;

/**
 * One deterministic insight (Stage 4) — severity is always paired with an
 * icon and a text label, never color alone (STAGE_1A_UX_ARCHITECTURE.md
 * §U), and every message is shown alongside the specific recorded numbers
 * (`evidence`) it came from, so nothing here reads as an unexplained
 * black-box judgment.
 */
export function InsightCard({ insight }: { insight: Insight }) {
  const navigate = useNavigate();
  const Icon = SEVERITY_ICON[insight.severity];

  return (
    <li className={styles.card}>
      <Icon
        size={18}
        strokeWidth={1.5}
        className={styles.icon}
        data-severity={insight.severity}
        aria-hidden="true"
      />
      <div className={styles.body}>
        <StatusBadge tone={SEVERITY_TONE[insight.severity]}>
          {SEVERITY_LABEL[insight.severity]}
        </StatusBadge>
        <p className={styles.message}>{insight.message}</p>
        <p className={styles.evidence}>{insight.evidence}</p>
        {insight.courseId && (
          <button
            type="button"
            className={styles.link}
            onClick={() => navigate(`/courses/${insight.courseId}`)}
          >
            View course →
          </button>
        )}
      </div>
    </li>
  );
}
