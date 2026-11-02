import styles from './MobileCards.module.css';

export function CardPager({ label, page, pageSize, total, onChange }: {
  label: string;
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const pages = Math.ceil(total / pageSize);
  return (
    <nav className={styles.pager} aria-label={label}>
      <button type="button" aria-label={`${label}: anteriores`} disabled={page === 0} onClick={() => onChange(page - 1)}>←</button>
      <span aria-live="polite">{page * pageSize + 1}{pageSize > 1 && total > 1 ? `–${Math.min(total, (page + 1) * pageSize)}` : ''} de {total}</span>
      <button type="button" aria-label={`${label}: próximos`} disabled={page >= pages - 1} onClick={() => onChange(page + 1)}>→</button>
    </nav>
  );
}
