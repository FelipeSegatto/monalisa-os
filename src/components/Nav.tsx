import heartIcon from '../assets/images/coracao-monalisa.svg';
import styles from './Nav.module.css';

export function Nav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.links}>
        <a href="#sobre" className={`${styles.link} ${styles.linkAbout}`}>
          Sobre a monalisa
        </a>
        <a href="#agendar" className={`${styles.link} ${styles.linkBookNow}`}>
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
