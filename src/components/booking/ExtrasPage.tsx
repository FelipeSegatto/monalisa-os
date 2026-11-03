import { useState } from 'react';
import { useMobileBooking } from '../../hooks/useMobileBooking';
import { CardPager } from './CardPager';
import mobileStyles from './MobileCards.module.css';
import { CATALOG_ITEMS } from '../../data/catalog';
import { EXTRAS, brl, priceNumber } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import bkUau from '../../assets/images/bk-uau2.webp';
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
  const isMobile = useMobileBooking();
  const [extraPage, setExtraPage] = useState(0);
  const [procedurePage, setProcedurePage] = useState(0);
  const inCartSet = new Set(cart.map((c) => c.i));
  const available = CATALOG_ITEMS.map((item, i) => ({ item, i })).filter(({ i }) => !inCartSet.has(i));
  const currentProcedurePage = Math.min(procedurePage, Math.max(0, Math.ceil(available.length / 2) - 1));
  const extras = EXTRAS.map((extra, i) => ({ extra, i }));
  const shownExtras = isMobile ? extras.slice(extraPage, extraPage + 1) : extras;
  const shownProcedures = isMobile ? available.slice(currentProcedurePage * 2, currentProcedurePage * 2 + 2) : available;

  return (
    <PageShell side="right" bg="#2F1CFF" color="#FEFEFE" className={isMobile ? mobileStyles.extrasPage : undefined}>
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

      <div style={{ position: 'relative', fontWeight: 700, fontSize: isMobile ? '3.8cqw' : '3.6cqw', lineHeight: 1.05, width: '62%' }}>algo a mais?</div>
      <span style={{ position: 'relative', marginTop: '1.6cqw', fontSize: 'max(11px, 1.5cqw)', opacity: 0.85, width: '62%' }}>
        extras para a mesma visita
      </span>

      <div className={isMobile ? mobileStyles.extraChoices : undefined} style={{ position: 'relative', marginTop: '2.4cqw', width: isMobile ? '100%' : '66%', display: 'flex', flexDirection: 'column', gap: '.9cqw' }}>
        {shownExtras.map(({ extra, i }) => {
          const on = extraIdx.includes(i);
          return (
            <button
              key={extra.name}
              data-extra-index={i}
              className={isMobile ? mobileStyles.extraCard : undefined}
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

      {isMobile && <CardPager label="Extras" page={extraPage} pageSize={1} total={EXTRAS.length} onChange={setExtraPage} />}

      <span style={{ position: 'relative', marginTop: '2.4cqw', fontSize: 'max(11px, 1.5cqw)', opacity: 0.85 }}>outros procedimentos</span>
      <div className={isMobile ? mobileStyles.procedureChoices : undefined} style={{ position: 'relative', marginTop: '1cqw', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.9cqw' }}>
        {shownProcedures.map(({ item, i }) => (
          <button key={item.name} data-add-procedure={i} className={isMobile ? mobileStyles.procedureCard : undefined} type="button" onClick={() => addToCart(i)} style={{ ...chipStyle, background: 'transparent', color: '#FEFEFE' }}>
            <span>+ {item.name}</span>
            <span style={{ whiteSpace: 'nowrap', opacity: 0.85 }}>{brl(priceNumber(item.price))}</span>
          </button>
        ))}
      </div>

      {isMobile && <CardPager label="Procedimentos" page={currentProcedurePage} pageSize={2} total={available.length} onChange={setProcedurePage} />}
      {isMobile && available.length === 0 && <p className={mobileStyles.allAdded}>Todos os procedimentos estão no carrinho.</p>}

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
