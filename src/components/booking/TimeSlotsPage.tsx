import { useMobileBooking } from '../../hooks/useMobileBooking';
import { MORNING, AFTERNOON, WEEK, formatDateLabel, isSlotTaken, weekdayOf } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import { CollageTitle } from '../CollageTitle';
import { PageShell } from './PageShell';
import styles from './Book.module.css';

const slotStyle = {
  fontFamily: "'Riccione Serial', Georgia, serif",
  fontSize: 'max(12px, 1.6cqw)',
  padding: '.7cqw 0',
  border: '1.5px solid #161515',
  borderRadius: 4,
  transition: 'transform .25s cubic-bezier(.2,.9,.3,1.4)',
} as const;

export function TimeSlotsPage() {
  const isMobile = useMobileBooking();
  const { day, time, pickTime, ok2, bkGo, calYear, calMonth } = useBooking();

  const periods =
    day != null
      ? [
          { label: 'manhã', slots: MORNING.map((t, i) => ({ t, i })) },
          { label: 'tarde', slots: AFTERNOON.map((t, i) => ({ t, i: i + 12 })) },
        ]
      : [];

  const dateLabel = day != null ? formatDateLabel(day, calMonth) : '';
  const weekday = day != null ? WEEK[weekdayOf(calYear, calMonth, day)] : '';

  return (
    <PageShell side="right" bg="#F7F2E7" color="#161515">
      {day != null ? (
        <>
          <div
            style={{
              position: 'relative',
              fontFamily: "'Delikaaat', cursive",
              fontSize: '5.6cqw',
              lineHeight: 1.1,
              color: '#161515',
              WebkitTextStroke: '.05em #FF394A',
              paintOrder: 'stroke fill',
            }}
          >
            {dateLabel}
          </div>
          <div style={{ position: 'relative', marginTop: '1.4cqw' }}>
            <CollageTitle text={weekday} fontSize="3.4cqw" baseDelay={0} as="div" />
          </div>
          <div style={{ position: 'relative', marginTop: '2.4cqw', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '2.6cqw' }}>
            {periods.map((period) => (
              <div key={period.label} style={{ display: 'flex', flexDirection: 'column', gap: '1cqw' }}>
                <span style={{ fontWeight: 700, fontSize: 'max(12px, 1.7cqw)' }}>{period.label}</span>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, 1fr)', gap: '.8cqw' }}>
                  {period.slots.map(({ t, i }) => {
                    const taken = isSlotTaken(day, i);
                    const selected = time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={taken}
                        onClick={() => !taken && pickTime(t)}
                        style={{
                          ...slotStyle,
                          cursor: taken ? 'default' : 'pointer',
                          background: selected ? '#161515' : '#FEFEFE',
                          color: selected ? '#FEFEFE' : '#161515',
                          opacity: taken ? 0.35 : 1,
                          textDecoration: taken ? 'line-through' : 'none',
                          transform: selected ? 'rotate(-3deg) scale(1.06)' : 'none',
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ position: 'relative', margin: 'auto 0', fontSize: 'max(14px, 2.4cqw)', lineHeight: 1.3, textAlign: 'center' }}>
          ← escolha um dia no calendário
        </div>
      )}

      <div className={styles.navRowEnd}>
        <span className={styles.followLabel} style={{ opacity: ok2 ? 1 : 0.4 }}>
          seguir para seus dados
        </span>
        <button
          type="button"
          aria-label="Seguir"
          disabled={!ok2}
          onClick={() => ok2 && bkGo(1)}
          className={styles.navBtn}
          style={{ opacity: ok2 ? 1 : 0.4 }}
        >
          →
        </button>
      </div>
    </PageShell>
  );
}
