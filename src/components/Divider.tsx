import styles from "./Divider.module.css";

export function Divider({ label }: { label?: string }) {
  if (label) {
    return (
      <div className={styles.labeled} role="separator">
        <span className={styles.line} />
        <span className={styles.label}>{label}</span>
        <span className={styles.line} />
      </div>
    );
  }
  return <hr className={styles.divider} />;
}
