import cover from '../../assets/images/bk-cover.png';
import styles from './Book.module.css';

export function CoverPage({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" aria-label="Abrir agenda" className={styles.cover} onClick={onOpen}>
      <img src={cover} alt="Agenda Monalisa" draggable={false} />
    </button>
  );
}
