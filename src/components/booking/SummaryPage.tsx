import { CATALOG_ITEMS } from '../../data/catalog';
import { WEEK, brl, formatDateLabel, summaryLines, weekdayOf } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import { PageShell } from './PageShell';
import styles from './Book.module.css';

export function SummaryPage() {
  const { cart, extraIdx, day, time, total, ok3, bkGo, openPay, calYear, calMonth } = useBooking();

  const lines = summaryLines(cart, extraIdx, CATALOG_ITEMS);
  const sumDay = day != null ? `${WEEK[weekdayOf(calYear, calMonth, day)]}, ${formatDateLabel(day, calMonth)}` : '—';
  const sumTime = time || '—';

  return (
    <PageShell side="right" bg="#FF5179" color="#161515">
      <div
        style={{
          position: 'relative',
          fontWeight: 700,
          fontSize: '4.6cqw',
          lineHeight: 1,
          color: '#161515',
          WebkitTextStroke: '.14em #FEFEFE',
          paintOrder: 'stroke fill',
        }}
      >
        Resumo
      </div>

      <div
        style={{
          position: 'relative',
          marginTop: '3cqw',
          background: '#FEFEFE',
          border: '2px solid #161515',
          padding: '1.8cqw 2.4cqw',
          transform: 'rotate(-1.2deg)',
          fontSize: 'max(12px, 1.6cqw)',
          boxShadow: '.5cqw .5cqw 0 #161515',
        }}
      >
        {(lines.length ? lines : [{ k: 'nenhum item', v: '—', amt: 0 }]).map((ln) => (
          <div key={ln.k} style={{ display: 'flex', justifyContent: 'space-between', gap: '2cqw', padding: '.8cqw 0', borderBottom: '1.5px dashed #161515' }}>
            <span>{ln.k}</span>
            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{ln.v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2cqw', padding: '1cqw 0', borderBottom: '1.5px dashed #161515' }}>
          <span>dia</span>
          <span style={{ fontWeight: 700, textAlign: 'right' }}>{sumDay}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2cqw', padding: '1cqw 0', borderBottom: '1.5px dashed #161515' }}>
          <span>horário</span>
          <span style={{ fontWeight: 700, textAlign: 'right' }}>{sumTime}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1.2cqw', fontSize: 'max(15px, 2.2cqw)', fontWeight: 700 }}>
          <span>total</span>
          <span>{brl(total)}</span>
        </div>
      </div>

      <div className={styles.navRow}>
        <button type="button" aria-label="Voltar" className={styles.navBtn} onClick={() => bkGo(-1)}>
          ←
        </button>
        <button
          type="button"
          disabled={!ok3}
          onClick={openPay}
          style={{
            fontFamily: "'Riccione Serial', Georgia, serif",
            fontSize: 'max(14px, 2cqw)',
            padding: '1.2cqw 2.4cqw',
            border: '2px solid #161515',
            borderRadius: 4,
            background: '#161515',
            color: '#EEEEEE',
            cursor: 'pointer',
            opacity: ok3 ? 1 : 0.4,
          }}
        >
          ir para pagamento
        </button>
      </div>
      <span style={{ position: 'relative', marginTop: '1cqw', textAlign: 'right', fontSize: 'max(11px, 1.3cqw)', opacity: ok3 ? 0 : 0.8 }}>
        preencha nome e WhatsApp na página ao lado
      </span>
    </PageShell>
  );
}
