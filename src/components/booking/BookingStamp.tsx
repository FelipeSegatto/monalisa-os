import stamp from '../../assets/images/confirmado.svg';
import styles from './Book.module.css';

export function BookingStamp() {
  return <img src={stamp} className={styles.stampImage} alt="" aria-hidden="true" draggable={false} />;
}
