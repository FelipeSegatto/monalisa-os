import { useBooking } from '../../context/BookingContext';
import { Leaf } from './Leaf';
import { CoverPage } from './CoverPage';
import { ProceduresPage } from './ProceduresPage';
import { ExtrasPage } from './ExtrasPage';
import { CalendarPage } from './CalendarPage';
import { TimeSlotsPage } from './TimeSlotsPage';
import { UserInfoPage } from './UserInfoPage';
import { SummaryPage } from './SummaryPage';
import { ConfirmationPage } from './ConfirmationPage';
import { BasePage } from './BasePage';
import { ProgressTabs } from './ProgressTabs';
import { PaymentModal } from './PaymentModal';
import styles from './Book.module.css';

function leafProps(k: number, bkS: number, bkFlip: number) {
  const turned = k < bkS;
  return {
    transform: turned ? 'rotateY(-180deg)' : 'rotateY(0deg)',
    zIndex: bkFlip === k ? 50 : turned ? 10 + k : 10 - k,
    frontPointerEvents: (k === bkS ? 'auto' : 'none') as 'auto' | 'none',
    backPointerEvents: (k === bkS - 1 ? 'auto' : 'none') as 'auto' | 'none',
  };
}

export function BookingOverlay() {
  const { bookOpen, bkS, bkFlip, closeBook, bkGo, payOpen } = useBooking();

  if (!bookOpen) return null;

  const bookTransform = bkS === 0 ? 'translateX(-25%)' : 'translateX(0)';
  const baseOpacity = bkS >= 3 ? 1 : 0;

  return (
    <div className={styles.overlay}>
      <div className={styles.topbar}>
        <button type="button" className={styles.backButton} onClick={closeBook}>
          ← voltar ao site
        </button>
        <span className={styles.brand}>monalisa</span>
      </div>

      <div className={styles.wrapper}>
        <div className={styles.book} style={{ transform: bookTransform }}>
          <div className={styles.base} style={{ opacity: baseOpacity }}>
            <BasePage />
          </div>

          <Leaf {...leafProps(0, bkS, bkFlip)} front={<CoverPage onOpen={() => bkS === 0 && bkGo(1)} />} back={<ProceduresPage />} />
          <Leaf {...leafProps(1, bkS, bkFlip)} front={<ExtrasPage />} back={<CalendarPage />} />
          <Leaf {...leafProps(2, bkS, bkFlip)} front={<TimeSlotsPage />} back={<UserInfoPage />} />
          <Leaf {...leafProps(3, bkS, bkFlip)} front={<SummaryPage />} back={<ConfirmationPage />} />

          <ProgressTabs />
        </div>
      </div>

      {payOpen && <PaymentModal />}
    </div>
  );
}
