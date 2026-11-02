import { useBooking } from '../../context/BookingContext';
import paperTexture from '../../assets/images/textura-papel.png';
import bookStyles from './Book.module.css';
import styles from './BasePage.module.css';

export function BasePage() {
  const { bkS, closeBook, bkReset } = useBooking();
  const done = bkS === 4;

  return (
    <div className={bookStyles.baseInner}>
      {done && <div className={styles.stamp}>CONFIRMADO</div>}
      <button type="button" className={styles.backButton} onClick={closeBook}>
        voltar ao site
      </button>
      <button type="button" className={styles.resetButton} onClick={bkReset}>
        fazer outro agendamento
      </button>
      <div aria-hidden="true" className={bookStyles.spineRight} />
      <div aria-hidden="true" className={bookStyles.pageTexture} style={{ backgroundImage: `url(${paperTexture})` }} />
    </div>
  );
}
