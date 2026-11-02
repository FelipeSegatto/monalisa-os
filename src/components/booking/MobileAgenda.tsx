import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { BookingPageNavigation, useBooking } from '../../context/BookingContext';
import { CoverPage } from './CoverPage';
import { ProceduresPage } from './ProceduresPage';
import { ExtrasPage } from './ExtrasPage';
import { CalendarPage } from './CalendarPage';
import { TimeSlotsPage } from './TimeSlotsPage';
import { UserInfoPage } from './UserInfoPage';
import { SummaryPage } from './SummaryPage';
import { BookingStamp } from './BookingStamp';
import spiral from '../../assets/images/bk-spiral-closed.png';
import grain from '../../assets/images/booking-paper-grain.svg';
import sitting from '../../assets/images/bk-sitting2.png';
import uau from '../../assets/images/bk-uau2.png';
import couple from '../../assets/images/bk-couple.png';
import styles from './Book.module.css';

const LABELS = ['Capa', 'algo a mais?', 'carrinho', 'calendário', 'horário', 'seus dados', 'resumo'];
const COLORS = ['#F2B21B', '#2F1CFF', '#2F1CFF', '#EEEEEE', '#EEEEEE', '#F6B900', '#FF5179'];
const BACK_ILLUSTRATIONS: Record<number, string> = { 1: uau, 2: sitting, 3: couple };
const TURN_LOCK_MS = 1370;
type Motion = { page: number; direction: 1 | -1 } | null;

export function MobileAgenda({ bookRef }: { bookRef: RefObject<HTMLDivElement | null> }) {
  const { bkS, bkPhase, bkStamped, bkGo, bkJump, ok1, ok2 } = useBooking();
  const [side, setSide] = useState(0);
  const [motion, setMotion] = useState<Motion>(null);
  const locked = useRef(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const step = bkS === 0 ? 0 : (bkS - 1) * 2 + 1 + side;
  const closing = bkPhase === 'closing' || bkPhase === 'gone' || bkPhase === 'final';
  const shownStep = closing ? 0 : step;
  const leaving = bkPhase === 'gone' || bkPhase === 'final';

  const [observedStep, setObservedStep] = useState(step);
  // Capture the previous page before React commits the new transform; this also
  // catches automatic cover opening and spread changes from the desktop flow.
  if (observedStep !== step) {
    const direction = step > observedStep ? 1 : -1;
    setObservedStep(step);
    setMotion(bkPhase ? null : { page: direction === 1 ? observedStep : step, direction });
  }
  if (bkS === 0 && side !== 0) setSide(0);

  useEffect(() => {
    if (!motion || bkPhase) { locked.current = false; return; }
    locked.current = true;
    const timer = setTimeout(() => { setMotion(null); locked.current = false; }, TURN_LOCK_MS);
    return () => clearTimeout(timer);
  }, [motion, bkPhase]);

  useEffect(() => {
    if (!bkPhase) wrapper.current?.closest('[data-booking-overlay]')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [step, bkPhase]);

  const canContinue = step === 2 ? ok1 : step === 4 ? ok2 : true;
  const navigate = (direction: 1 | -1) => {
    if (bkPhase || locked.current || (direction === 1 && (!canContinue || step === 6))) return;
    if (bkS === 0) { setSide(0); bkGo(1); }
    else if (direction === 1 && side === 0) setSide(1);
    else if (direction === -1 && side === 1) setSide(0);
    else { setSide(direction === 1 ? 0 : 1); bkGo(direction); }
  };
  const pages = [
    <CoverPage key="CoverPage" onOpen={() => navigate(1)} />,
    <ExtrasPage key="ExtrasPage" />,
    <ProceduresPage key="ProceduresPage" />,
    <CalendarPage key="CalendarPage" />,
    <TimeSlotsPage key="TimeSlotsPage" />,
    <UserInfoPage key="UserInfoPage" />,
    <SummaryPage key="SummaryPage" />,
  ];
  return (
    <BookingPageNavigation onNavigate={navigate} onJump={(target) => { setSide(0); bkJump(target); }}>
      <div ref={wrapper} className={styles.mobileStage}>
        <div ref={bookRef} className={`${styles.mobileBook} ${closing ? styles.mobileFast : ''}`} data-book-spread={bkS} data-book-phase={bkPhase ?? 'idle'} data-mobile-step={step} inert={!!bkPhase} style={{ transform: leaving ? 'translate(0,-140vh) rotate(-14deg)' : 'none' }}>
          {pages.map((page, p) => {
            const turning = !closing && motion?.page === p;
            const direction = motion?.direction;
            const visible = p >= shownStep || p === shownStep - 1 || turning || (motion?.direction === 1 && p === shownStep - 2) || closing;
            const turned = p < shownStep;
            const underTurn = motion && p === motion.page + 1;
            return (
              <div key={p} className={`${styles.mobileFace} ${turning ? direction === 1 ? styles.mobileLifting : styles.mobileDropping : ''}`} data-mobile-page={p} data-turned={turned} data-turning={turning} inert={p !== shownStep || !!bkPhase} style={{ transform: `rotateY(${turned ? -180 : 0}deg) translateZ(${p % 2 === 0 ? 1 : 0}px)`, zIndex: turning ? 50 : 20 - p, visibility: visible ? 'visible' : 'hidden', pointerEvents: p === shownStep && !bkPhase ? 'auto' : 'none' }}>
                {page}
                {underTurn && !closing && <div key={`${motion.page}-${direction}`} className={`${styles.mobilePageShade} ${direction === 1 ? styles.mobileShadeOut : styles.mobileShadeIn}`} aria-hidden="true" />}
                <div key={`${motion?.page}-${direction}`} aria-hidden="true" className={`${styles.mobileBack} ${turning ? direction === 1 ? styles.mobileBackOn : styles.mobileBackOff : ''}`} style={{ backgroundColor: COLORS[p], backgroundImage: `url("${grain}")`, opacity: turned ? 1 : 0 }}>
                  {BACK_ILLUSTRATIONS[p] && <img src={BACK_ILLUSTRATIONS[p]} alt="" className={styles.mobileBackIllustration} />}
                </div>
                {bkStamped && p === 6 && <div className={styles.mobileStamp}><BookingStamp /></div>}
              </div>
            );
          })}
          <img src={spiral} alt="" aria-hidden="true" className={styles.mobileSpiral} />
        </div>
        {step >= 1 && !bkPhase && <nav className={styles.mobileNavigation} aria-label="Páginas da agenda">
          <button type="button" className={styles.navBtn} aria-label="Página anterior" disabled={!!motion} onClick={() => navigate(-1)}>←</button>
          <span aria-live="polite">{step} / 6 · {LABELS[step]}</span>
          {step < 6 ? <button type="button" className={styles.navBtn} aria-label="Próxima página" disabled={!canContinue || !!motion} onClick={() => navigate(1)}>→</button> : <span className={styles.mobileNavSpacer} />}
        </nav>}
      </div>
    </BookingPageNavigation>
  );
}
