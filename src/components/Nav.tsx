import type { MouseEvent } from 'react';
import heartIcon from '../assets/images/coracao-monalisa.svg';
import { useBooking } from '../context/BookingContext';
import styles from './Nav.module.css';

export function Nav() {
  const { openBook } = useBooking();

  const handleBookNow = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openBook(null);
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <a href="#sobre" className={`${styles.link} ${styles.linkAbout}`}>
          Sobre a monalisa
        </a>
        <a href="#agendar" className={`${styles.link} ${styles.linkBookNow}`} onClick={handleBookNow}>
          BOOK NOW
        </a>
        <a href="#catalogo" className={`${styles.link} ${styles.linkCatalogue}`}>
          Catálogo
        </a>
      </div>
      <div className={styles.right}>
        <button type="button" className={styles.heartButton} aria-label="Favoritos">
          <img src={heartIcon} alt="" className={styles.heartIcon} />
        </button>
        <button type="button" className={styles.signIn}>
          Entrar
        </button>
      </div>
    </nav>
  );
}
