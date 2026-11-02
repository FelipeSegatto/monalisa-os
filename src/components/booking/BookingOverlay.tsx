import { useEffect, useRef, useState } from 'react';
import { useMobileBooking } from '../../hooks/useMobileBooking';
import { MobileAgenda } from './MobileAgenda';
import { useBooking } from '../../context/BookingContext';
import { Leaf } from './Leaf';
import { CoverPage } from './CoverPage';
import { ProceduresPage } from './ProceduresPage';
import { ExtrasPage } from './ExtrasPage';
import { CalendarPage } from './CalendarPage';
import { TimeSlotsPage } from './TimeSlotsPage';
import { UserInfoPage } from './UserInfoPage';
import { SummaryPage } from './SummaryPage';
import { ProgressTabs } from './ProgressTabs';
import { PaymentModal } from './PaymentModal';
import { BookingStamp } from './BookingStamp';
import { BookingCelebration } from './BookingCelebration';
import cover from '../../assets/images/bk-cover.png';
import stampAsset from '../../assets/images/confirmado.svg';
import spiralClosed from '../../assets/images/bk-spiral-closed.png';
import spiralOpen from '../../assets/images/bk-spiral.png';
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
  const isMobile = useMobileBooking();
  const [returning, setReturning] = useState(false);
  const { bookOpen, bkS, bkFlip, closeBook, bkGo, payOpen, bkPhase, bkFast, bkStamped, stampLanded, bkReset } = useBooking();
  useEffect(() => {
    // Load both bindings before the user starts a cover turn, including on a cold visit.
    [cover, spiralOpen, spiralClosed, stampAsset].forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, []);
  const bookRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const stampLandedRef = useRef(stampLanded);
  useEffect(() => { stampLandedRef.current = stampLanded; });

  useEffect(() => {
    if (!bookOpen || bkPhase !== 'stamp') return;
    const book = bookRef.current;
    const stamp = stampRef.current;
    if (!book || !stamp) return;
    const rect = book.getBoundingClientRect();
    const unit = rect.width / 100;
    Object.assign(stamp.style, { left: `${rect.left + (isMobile ? 25 : 50) * unit}px`, top: `${rect.top + 33.2 * unit}px`, width: `${76 * unit}px`, height: `${30 * unit}px` });
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = Math.max(innerWidth / (76 * unit), innerHeight / (30 * unit)) * 1.3;
    const base = 'translate(-50%,-50%) rotate(-8deg)';
    const landingScale = isMobile ? .6 : 1;
    const animation = stamp.animate([
      { transform: `${base} scale(${reduced ? 1 : scale})`, opacity: 0 },
      { opacity: 1, offset: .3 },
      { transform: `${base} scale(${landingScale})`, opacity: 1 },
    ], { duration: reduced ? 1 : 850, easing: 'cubic-bezier(.55,0,.9,.45)', fill: 'forwards' });
    let shake: Animation | undefined;
    animation.onfinish = () => {
      stampLandedRef.current();
      if (!reduced) shake = stageRef.current?.animate([{ transform: 'none' }, { transform: 'translate(-5px,6px)' }, { transform: 'translate(3px,-2px)' }, { transform: 'none' }], { duration: 260 });
    };
    return () => { animation.cancel(); shake?.cancel(); };
  }, [bookOpen, bkPhase, isMobile]);

  if (!bookOpen) return null;
  const leaving = bkPhase === 'gone' || bkPhase === 'final';
  const transform = leaving ? 'translate(-25%,-140vh) rotate(-14deg)' : bkS === 0 ? 'translateX(-25%)' : 'translateX(0)';
  const canInteract = !bkPhase;
  const stamped = (side: 'left' | 'right') => bkStamped && <div className={`${styles.pageStamp} ${side === 'left' ? styles.stampLeft : styles.stampRight}`}><BookingStamp /></div>;

  return (
    <div className={styles.overlay} data-booking-overlay data-book-phase={bkPhase ?? 'idle'} onScroll={isMobile ? (event) => { if (event.currentTarget.scrollLeft !== 0) event.currentTarget.scrollLeft = 0; } : undefined}>
      <div className={styles.topbar}>
        <button type="button" className={styles.backButton} onClick={closeBook}>← voltar ao site</button>
        <span className={styles.brand}>monalisa</span>
      </div>
      <div ref={stageRef} className={`${styles.wrapper} ${bkPhase === 'final' ? styles.confirmationWrapper : returning ? styles.returningBook : ''}`} onAnimationEnd={(event) => { if (event.target === event.currentTarget) setReturning(false); }}>
        {bkPhase === 'final' ? <BookingCelebration onRestart={() => { setReturning(true); bkReset(); }} /> : (<>
        {isMobile ? <MobileAgenda bookRef={bookRef} /> : (
        <div ref={bookRef} className={`${styles.book} ${bkFast ? styles.fast : ''}`} data-book-spread={bkS} data-book-phase={bkPhase ?? 'idle'} inert={!canInteract} style={{ transform, transition: leaving ? 'transform .85s cubic-bezier(.55,0,.8,.25)' : undefined, pointerEvents: canInteract ? 'auto' : 'none' }}>
          <Leaf {...leafProps(0, bkS, bkFlip)} cover front={<CoverPage onOpen={() => bkS === 0 && bkGo(1)} />} back={<ProceduresPage />} />
          <Leaf {...leafProps(1, bkS, bkFlip)} front={<ExtrasPage />} back={<CalendarPage />} />
          <Leaf {...leafProps(2, bkS, bkFlip)} front={<TimeSlotsPage />} back={<><UserInfoPage />{stamped('left')}</>} />
          <Leaf {...leafProps(3, bkS, bkFlip)} front={<><SummaryPage />{stamped('right')}</>} back={null} />
          {/* Keep both images mounted and switch immediately at the start of the cover turn.
              The closed rings fade over the already visible inner binding: no empty spine. */}
          <img aria-hidden="true" src={spiralOpen} className={styles.spiralOpen} style={{ opacity: bkS >= 1 ? 1 : 0, transition: bkS >= 1 ? 'none' : 'opacity .18s ease' }} />
          <img aria-hidden="true" src={spiralClosed} className={styles.spiralClosed} style={{ opacity: bkS === 0 ? 1 : 0 }} />
          <div style={{ visibility: bkPhase ? 'hidden' : 'visible' }}><ProgressTabs /></div>
        </div>
        )}
        </>)}
      </div>
      {payOpen && <PaymentModal />}
      {bkPhase === 'stamp' && !bkStamped && <div ref={stampRef} className={styles.flyingStamp}><BookingStamp /></div>}
    </div>
  );
}
