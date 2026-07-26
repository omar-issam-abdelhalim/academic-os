import { useNavigate } from "react-router-dom";
import {
  BarChart2,
  Tag as TagIcon,
  Settings,
  Download,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { ScreenHeader } from "@/app/ScreenHeader";
import styles from "./MoreScreen.module.css";

const ITEMS = [
  { to: "/performance", label: "Performance", Icon: BarChart2 },
  { to: "/tags", label: "Tags", Icon: TagIcon },
  { to: "/settings", label: "Settings", Icon: Settings },
];

const DATA_ITEMS = [
  { to: "/data/export", label: "Semester End & Export", Icon: Download, danger: false },
  { to: "/data/new-semester", label: "Start New Semester", Icon: RotateCcw, danger: true },
];

/** Mobile-only entry point to secondary destinations
 * (STAGE_1A_UX_ARCHITECTURE.md §C). Destructive actions are visually
 * separated into their own "danger zone" subsection (§O). */
export function MoreScreen() {
  const navigate = useNavigate();
  return (
    <div>
      <ScreenHeader title="More" />
      <div className={styles.content}>
        <ul className={styles.list}>
          {ITEMS.map(({ to, label, Icon }) => (
            <li key={to}>
              <button type="button" className={styles.row} onClick={() => navigate(to)}>
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                <span className={styles.label}>{label}</span>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className={styles.chevron}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>

        <p className={styles.groupLabel}>Data</p>
        <ul className={styles.list}>
          {DATA_ITEMS.map(({ to, label, Icon, danger }) => (
            <li key={to}>
              <button
                type="button"
                className={danger ? `${styles.row} ${styles.danger}` : styles.row}
                onClick={() => navigate(to)}
              >
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                <span className={styles.label}>{label}</span>
                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className={styles.chevron}
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
