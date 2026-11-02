import bkLogo from '../../assets/images/bk-logo.png';
import bkAgenda from '../../assets/images/bk-agenda.png';
import paperTexture from '../../assets/images/textura-papel.png';
import styles from './Book.module.css';

interface CoverPageProps {
  onOpen: () => void;
}

export function CoverPage({ onOpen }: CoverPageProps) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#FF394A', cursor: 'pointer' }} onClick={onOpen}>
      <img src={bkLogo} alt="monalisa" style={{ position: 'absolute', left: '14%', top: '20%', width: '66%', display: 'block' }} />
      <img src={bkAgenda} alt="Agenda" style={{ position: 'absolute', left: '16%', top: '56%', width: '66%', display: 'block' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '5cqw', display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            fontFamily: "'Riccione Serial', Georgia, serif",
            fontSize: 'max(15px, 2.2cqw)',
            padding: '1.2cqw 2.8cqw',
            background: '#161515',
            color: '#FEFEFE',
            border: '2px solid #161515',
            borderRadius: 999,
            boxShadow: '0 .5cqw 0 #FEFEFE',
          }}
        >
          abrir agenda →
        </span>
      </div>
      <div aria-hidden="true" className={styles.spineCover} />
      <div
        aria-hidden="true"
        className={styles.coverTexture}
        style={{ backgroundImage: `url(${paperTexture})` }}
      />
    </div>
  );
}
