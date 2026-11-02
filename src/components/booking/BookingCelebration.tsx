import { useEffect, useRef } from 'react';
import { useBooking } from '../../context/BookingContext';
import { WEEK, formatDateLabel, weekdayOf } from '../../data/booking';
import { CollageTitle } from '../CollageTitle';
import { createPortal } from 'react-dom';
import styles from './Book.module.css';

const PAID_TEXT = { pix: 'Pagamento via Pix recebido.', card: 'Pagamento no cartão aprovado.', local: 'O pagamento fica para o dia.' };

export function BookingCelebration() {
  const { name, day, time, calYear, calMonth, paidWith, bkReset } = useBooking();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#F5B800', '#FF3B4E', '#2F1CFF', '#FF3D7F', '#00C0F2', '#161515', '#FEFEFE'];
    const particleCount = 200;
    const viewportHeight = el.clientHeight;
    const pieces = Array.from({ length: particleCount }, (_, i) => {
      const piece = document.createElement('span');
      const w = 7 + Math.random() * 9;
      piece.style.cssText = `position:absolute;left:${(i + Math.random()) / particleCount * 100}%;top:${35 + Math.random() * 25}%;width:${w}px;height:${w * (.4 + Math.random() * .9)}px;background:${colors[i % colors.length]};border:1px solid #161515;border-radius:${Math.random() < .3 ? '50%' : '1px'};pointer-events:none;z-index:5`;
      piece.setAttribute('aria-hidden', 'true');
      // Spread the burst across the viewport, then let each piece fall with gravity.
      const angle = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.1;
      const speed = (340 + Math.random() * 300) * Math.min(1.5, viewportHeight / 850);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const duration = 2200 + Math.random() * 1200;
      const drag = .65 + Math.random() * .4;
      const gravity = 600 + Math.random() * 220;
      const rotation = (Math.random() - .5) * 1440;
      const tilt = (Math.random() - .5) * 1080;
      const flutter = 8 + Math.random() * 14;
      el.appendChild(piece);
      const frames = Array.from({ length: 33 }, (_, frame) => {
        const progress = frame / 32;
        const seconds = progress * duration / 1000;
        const x = vx * (1 - Math.exp(-drag * seconds)) / drag
          + Math.sin(seconds * 8 + i) * flutter * progress;
        const y = vy * seconds + .5 * gravity * seconds * seconds;
        return {
          offset: progress,
          transform: `translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) rotateZ(${rotation * progress}deg) rotateX(${tilt * progress}deg) rotateY(${tilt * .6 * progress}deg) scale(${Math.min(1, .35 + progress * 8)})`,
          opacity: progress < .72 ? 1 : Math.max(0, (1 - progress) / .28),
        };
      });
      const animation = piece.animate(frames, {
        duration, delay: Math.random() * 90, easing: 'linear', fill: 'both',
      });
      animation.onfinish = () => piece.remove();
      return { piece, animation };
    });
    return () => pieces.forEach(({ piece, animation }) => { animation.cancel(); piece.remove(); });
  }, []);
  const date = day == null ? '' : `${WEEK[weekdayOf(calYear, calMonth, day)].toLowerCase()}, ${formatDateLabel(day, calMonth)}`;
  return (
    <>
      {createPortal(<div ref={ref} className={styles.confetti} data-booking-confetti aria-hidden="true" />, document.body)}
      <div className={styles.final} role="status">
        <CollageTitle text="Agendado!" fontSize="clamp(52px,9vw,112px)" baseDelay={.85} className={styles.finalTitle} />
        <p className={styles.finalGreeting}>{name.trim().split(' ')[0] || 'Te'}{name.trim() ? ', te' : ''} esperamos {date} às {time}.</p>
        <p className={styles.finalMessage}>{paidWith ? PAID_TEXT[paidWith] : ''} Enviamos a confirmação no seu WhatsApp. Quando chegar, por favor tire os sapatos.</p>
        <div className={styles.finalActions}>
          <button type="button" className={styles.backButton} onClick={bkReset}>fazer outro agendamento</button>
        </div>
      </div>
    </>
  );
}
