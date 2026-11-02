import { useBooking } from '../../context/BookingContext';
import styles from './Book.module.css';

const TABS = [
  { label: '1 · procedimentos', bg: '#F6B900' },
  { label: '2 · dia e horário', bg: '#FF5179' },
  { label: '3 · seus dados', bg: '#00C0F2' },
];

export function ProgressTabs() {
  const { bkS, bkMax, bkJump } = useBooking();
  const visible = bkS >= 1 && bkS < 4;

  return (
    <div className={styles.tabs} style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}>
      {TABS.map((tab, idx) => {
        const n = idx + 1;
        const ok = n <= bkMax && bkS < 4;
        const active = bkS === n;
        return (
          <button
            key={tab.label}
            type="button"
            disabled={!ok}
            onClick={() => ok && bkJump(n)}
            className={styles.tab}
            style={{
              background: tab.bg,
              cursor: ok ? 'pointer' : 'default',
              opacity: ok ? 1 : 0.45,
              fontWeight: active ? 700 : 400,
              borderWidth: active ? 3 : 2,
              boxShadow: active ? '0 3px 0 #161515' : 'none',
              transform: `translateX(${active ? 14 : 15}px) scale(${active ? 1.05 : 1})`,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
