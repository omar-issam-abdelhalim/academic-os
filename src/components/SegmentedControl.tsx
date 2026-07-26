import { cn } from "@/lib/classNames";
import styles from "./SegmentedControl.module.css";

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Course Detail's compact secondary-section switcher
 * (STAGE_1A_UX_ARCHITECTURE.md §H): "Selecting one swaps the body content
 * in place — no full-page navigation." Horizontal-scroll-if-needed on
 * narrow widths via overflow-x. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={styles.control}>
      {options.map((option) => (
        <button
          key={option.value}
          role="tab"
          type="button"
          aria-selected={option.value === value}
          className={cn(styles.segment, option.value === value && styles.active)}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
