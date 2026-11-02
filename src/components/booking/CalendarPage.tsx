import { daysInMonth, isDayOff, MONTH_NAMES, weekdayOf } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import { CollageTitle } from '../CollageTitle';
import bkCouple from '../../assets/images/bk-couple.png';
import { PageShell } from './PageShell';
import styles from './Book.module.css';

const monthNavBtnStyle = {
  width: 'max(22px, 2.4cqw)',
  height: 'max(22px, 2.4cqw)',
  flex: 'none',
  border: '2px solid #161515',
  borderRadius: 6,
  background: '#FEFEFE',
  color: '#161515',
  fontFamily: "'Riccione Serial', Georgia, serif",
  fontSize: 'max(13px, 1.6cqw)',
  cursor: 'pointer',
  padding: 0,
} as const;

export function CalendarPage() {
  const { day, pickDay, bkGo, calYear, calMonth, monthOffset, nextMonth, prevMonth } = useBooking();

  const total = daysInMonth(calYear, calMonth);
  const startWeekday = weekdayOf(calYear, calMonth, 1);
  const cellCount = Math.ceil((startWeekday + total) / 7) * 7;

  return (
    <PageShell side="left" bg="#EEEEEE" color="#161515">
      <img src={bkCouple} alt="" style={{ position: 'absolute', right: '1.5cqw', top: '3cqw', width: '19cqw', display: 'block' }} />

      <div style={{ position: 'relative', marginTop: '6.4cqw', marginRight: '3cqw', display: 'flex', alignItems: 'center', gap: '.4cqw' }}>
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={monthOffset === 0}
          onClick={prevMonth}
          style={{ ...monthNavBtnStyle, opacity: monthOffset === 0 ? 0.35 : 1, cursor: monthOffset === 0 ? 'default' : 'pointer' }}
        >
          ←
        </button>
        <CollageTitle key={`${calYear}-${calMonth}`} text={MONTH_NAMES[calMonth]} fontSize="3.8cqw" baseDelay={0.2} as="div" />
        <button type="button" aria-label="Próximo mês" onClick={nextMonth} style={monthNavBtnStyle}>
          →
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          marginTop: '2.4cqw',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          fontSize: 'max(11px, 1.4cqw)',
          textAlign: 'center',
          paddingBottom: '.6cqw',
        }}
      >
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>

      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderTop: '1px solid #161515',
          borderLeft: '1px solid #161515',
        }}
      >
        {Array.from({ length: cellCount }, (_, i) => {
          const d = i - startWeekday + 1;
          if (d < 1 || d > total) {
            return <div key={i} style={{ aspectRatio: '1 / 0.98', background: '#D9D9D9', borderRight: '1px solid #161515', borderBottom: '1px solid #161515' }} />;
          }
          const off = isDayOff(calYear, calMonth, d);
          const selected = day === d;
          return (
            <button
              key={i}
              type="button"
              disabled={off}
              onClick={() => !off && pickDay(d)}
              style={{
                aspectRatio: '1 / 0.98',
                border: 0,
                borderRight: '1px solid #161515',
                borderBottom: '1px solid #161515',
                fontFamily: "'Riccione Serial', Georgia, serif",
                fontWeight: 700,
                fontSize: 'max(12px, 1.8cqw)',
                padding: 0,
                cursor: off ? 'default' : 'pointer',
                background: selected ? '#FF3D7F' : '#D9D9D9',
                color: off ? '#9A9A9A' : '#161515',
                textDecoration: off ? 'line-through' : 'none',
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className={styles.navRow} style={{ fontSize: 'max(11px, 1.4cqw)' }}>
        <button type="button" aria-label="Voltar" className={styles.navBtn} onClick={() => bkGo(-1)}>
          ←
        </button>
        <span style={{ opacity: 0.7 }}>dias riscados estão lotados</span>
      </div>
    </PageShell>
  );
}
