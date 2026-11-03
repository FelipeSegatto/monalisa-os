import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { DEVICES, MID_LAYER_DEPTHS, BACK_LAYER_DEPTH, TIP_STYLES } from '../data/devices';
import styles from './Devices.module.css';

const SPIN_LOCK_MS = 2400;
const MOBILE_QUERY = '(max-width: 640px)';
const MOBILE_AUTO_SPIN_MS = 4000;
const SWIPE_THRESHOLD = 40;
const N = DEVICES.length;

interface TipStyle extends CSSProperties {
  '--r': string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function Devices() {
  const [turns, setTurns] = useState<number[]>(() => DEVICES.map(() => 0));
  const [active, setActive] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [devTip, setDevTip] = useState(-1);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const spinLock = useRef<number[]>(DEVICES.map(() => 0));
  const isMobile = useIsMobile();
  const dragStartX = useRef<number | null>(null);
  const dragMoved = useRef(false);

  const spin = (i: number) => {
    if (hoverIndex !== i) setHoverIndex(i);
    const now = Date.now();
    if (now - spinLock.current[i] < SPIN_LOCK_MS) return;
    spinLock.current[i] = now;
    setTurns((t) => {
      const next = [...t];
      next[i] += 360;
      return next;
    });
    setActive(i);
  };

  const leave = () => setHoverIndex(-1);

  const click = (i: number) => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    spin(i);
    setDevTip((prev) => (prev === i ? -1 : i));
  };

  const closeTip = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setDevTip(-1);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMobile) return;
    dragStartX.current = e.clientX;
    dragMoved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMobile || dragStartX.current === null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 8) dragMoved.current = true;
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isMobile || dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const next = dx < 0 ? (active + 1) % N : (active - 1 + N) % N;
      spin(next);
    }
  };

  // No hover on touch devices: keep the active device gently spinning on its own.
  useEffect(() => {
    if (!isMobile) return;
    const id = setInterval(() => spin(active), MOBILE_AUTO_SPIN_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, active]);

  useEffect(() => {
    DEVICES.forEach(({ img, cardboard, core }) => {
      [img, cardboard, core].forEach((src) => { const image = new Image(); image.src = src; });
    });
  }, []);

  const visibleIndices = isMobile ? [active] : DEVICES.map((_, i) => i);

  return (
    <section className={styles.devices}>
      <p className={styles.hint}>{isMobile ? 'toque para conhecer' : 'clique para conhecer'}</p>
      <div
        className={styles.grid}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {visibleIndices.map((i) => {
          const d = DEVICES[i];
          return (
            <div
              key={d.name}
              className={styles.item}
              role="button"
              tabIndex={0}
              aria-label={`Conhecer ${d.name}`}
              aria-expanded={devTip === i}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); click(i); }
              }}
              onMouseEnter={() => spin(i)}
              onMouseLeave={leave}
              onClick={() => click(i)}
            >
              <div className={styles.stage}>
                {devTip === i && (
                  <div
                    className={styles.tip}
                    style={{
                      '--r': `${TIP_STYLES[i].rotate}deg`,
                      background: TIP_STYLES[i].bg,
                      color: TIP_STYLES[i].color,
                    } as TipStyle}
                    onClick={closeTip}
                  >
                    <strong className={styles.tipTitle}>{d.tipTitle}</strong>
                    <p className={styles.tipText}>{d.tipText}</p>
                    <div className={styles.tipPoint} style={{ background: TIP_STYLES[i].bg }} />
                  </div>
                )}
                <div className={styles.turnLayer} style={{ transform: `rotateY(${turns[i]}deg)` }}>
                  <div
                    className={styles.hotLayer}
                    style={{ animation: hoverIndex === i ? 'cardSwayHot 3.2s ease-in-out 2.2s infinite' : 'none' }}
                  >
                    <div
                      className={styles.swayLayer}
                      style={{ animation: `cardSway ${(4.8 + i * 0.6).toFixed(2)}s ease-in-out ${(-i * 1.6).toFixed(2)}s infinite alternate` }}
                    >
                      <img data-device-face="front" src={d.img} alt={d.name} className={styles.front} draggable={false} onLoad={() => setLoadedImages((current) => current[d.name] ? current : { ...current, [d.name]: true })} />
                      {loadedImages[d.name] && MID_LAYER_DEPTHS.map((z) => (
                        <img
                          key={z}
                          src={d.core}
                          alt=""
                          draggable={false}
                          aria-hidden="true"
                          className={styles.layer}
                          style={{ transform: `translateZ(${-z}px)` }}
                        />
                      ))}
                      {loadedImages[d.name] && <img
                        src={d.cardboard}
                        alt=""
                        draggable={false}
                        data-device-face="back"
                        aria-hidden="true"
                        className={styles.layer}
                        style={{ transform: `translateZ(${-BACK_LAYER_DEPTH}px)` }}
                      />}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.name}>{d.name}</div>
            </div>
          );
        })}
      </div>

      <div className={styles.dots}>
        {DEVICES.map((d, i) => (
          <button
            key={d.name}
            type="button"
            className={styles.dot}
            aria-label={d.name}
            style={{ background: i === active ? '#FEFEFE' : 'transparent' }}
            onClick={() => spin(i)}
          />
        ))}
      </div>
    </section>
  );
}
