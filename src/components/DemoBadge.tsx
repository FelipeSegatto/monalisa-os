import styles from './DemoBadge.module.css';

export function DemoBadge() {
  return (
    <div className={styles.badge} role="status">
      <span className={styles.big}>DEMO</span>
      <span className={styles.small}>site de demonstração</span>
    </div>
  );
}
