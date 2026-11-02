import { CATALOG_ITEMS } from '../../data/catalog';
import { EXTRAS, brl, priceNumber } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import bkUau from '../../assets/images/bk-uau2.png';
import { PageShell } from './PageShell';
import styles from './Book.module.css';

const chipStyle = {
  fontFamily: "'Riccione Serial', Georgia, serif",
  fontSize: 'max(12px, 1.6cqw)',
  padding: '.9cqw 1.4cqw',
  border: '2px solid #FEFEFE',
  borderRadius: 4,
  cursor: 'pointer',
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1.4cqw',
  textAlign: 'left',
  transition: 'transform .25s cubic-bezier(.2,.9,.3,1.4)',
} as const;

export function ExtrasPage() {
  const { extraIdx, toggleExtra, cart, addToCart, ok1, bkGo } = useBooking();
  const inCartSet = new Set(cart.map((c) => c.i));

  return (
    <PageShell side="right" bg="#2F1CFF" color="#FEFEFE">
      <img
        src={bkUau}
        alt="uau!!!"
        style={{
          position: 'absolute',
          right: '2.4cqw',
          top: '3cqw',
          width: '17cqw',
          display: 'block',
          zIndex: 3,
          animation: 'collageIn .45s cubic-bezier(.2,.9,.3,1.25) both',
          ['--r' as string]: '-6deg',
          ['--y' as string]: '0em',
        }}
      />

      <div style={{ position: 'relative', fontWeight: 700, fontSize: '3.6cqw', lineHeight: 1.05, width: '62%' }}>algo a mais?</div>
      <span style={{ position: 'relative', marginTop: '1.6cqw', fontSize: 'max(11px, 1.5cqw)', opacity: 0.85, width: '62%' }}>
        extras para a mesma visita
      </span>

      <div style={{ position: 'relative', marginTop: '2.4cqw', width: '66%', display: 'flex', flexDirection: 'column', gap: '.9cqw' }}>
        {EXTRAS.map((extra, i) => {
          const on = extraIdx.includes(i);
          return (
            <button
              key={extra.name}
              type="button"
              onClick={() => toggleExtra(i)}
              style={{
                ...chipStyle,
                background: on ? '#FEFEFE' : 'transparent',
                color: on ? '#161515' : '#FEFEFE',
                transform: on ? 'rotate(-1.5deg)' : 'none',
              }}
            >
              <span>
                {on ? '✓' : '+'} {extra.name}
              </span>
              <span style={{ whiteSpace: 'nowrap', opacity: 0.85 }}>+{brl(extra.price)}</span>
            </button>
          );
        })}
      </div>

      <span style={{ position: 'relative', marginTop: '2.4cqw', fontSize: 'max(11px, 1.5cqw)', opacity: 0.85 }}>outros procedimentos</span>
      <div style={{ position: 'relative', marginTop: '1cqw', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.9cqw' }}>
        {CATALOG_ITEMS.map((item, i) => (!inCartSet.has(i) ? (
          <button key={item.name} type="button" onClick={() => addToCart(i)} style={{ ...chipStyle, background: 'transparent', color: '#FEFEFE' }}>
            <span>+ {item.name}</span>
            <span style={{ whiteSpace: 'nowrap', opacity: 0.85 }}>{brl(priceNumber(item.price))}</span>
          </button>
        ) : null))}
      </div>

      <div className={styles.navRowEnd}>
        <span className={styles.followLabel} style={{ opacity: ok1 ? 1 : 0.4 }}>
          seguir para o calendário
        </span>
        <button
          type="button"
          aria-label="Seguir"
          disabled={!ok1}
          onClick={() => ok1 && bkGo(1)}
          className={styles.navBtn}
          style={{ opacity: ok1 ? 1 : 0.4 }}
        >
          →
        </button>
      </div>
    </PageShell>
  );
}
