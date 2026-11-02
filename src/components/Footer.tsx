import heart from '../assets/images/coracao-monalisa.svg';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <span className={styles.brand}>monalisa</span>
          <img src={heart} alt="" aria-hidden="true" className={styles.heart} />
        </div>

        <div className={styles.info}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Telefone</span>
            <a href="tel:+5511985534076" className={styles.infoValue}>(11) 98553-4076</a>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Instagram</span>
            <a
              href="https://instagram.com/monalisalaser"
              target="_blank"
              rel="noreferrer"
              className={styles.infoValue}
            >
              @monalisalaser
            </a>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Endereço</span>
            <span className={styles.infoValue}>novo endereço em breve</span>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} monalisa</span>
      </div>
    </footer>
  );
}
