import { useRef, useState } from 'react';
import { DEVICES, MID_LAYER_DEPTHS, BACK_LAYER_DEPTH } from '../data/devices';
import styles from './Devices.module.css';

const SPIN_LOCK_MS = 2400;

export function Devices() {
  const [turns, setTurns] = useState<number[]>(() => DEVICES.map(() => 0));
  const [active, setActive] = useState(0);
  const [hoverIndex, setHoverIndex] = useState(-1);
  const spinLock = useRef<number[]>(DEVICES.map(() => 0));

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

  return (
    <section className={styles.devices}>
      <div className={styles.grid}>
        {DEVICES.map((d, i) => {
          const mask = `url(${d.img}) center / contain no-repeat`;
          return (
            <div
              key={d.name}
              className={styles.item}
              onMouseEnter={() => spin(i)}
              onMouseLeave={leave}
              onClick={() => spin(i)}
            >
              <div className={styles.stage}>
                <div className={styles.turnLayer} style={{ transform: `rotateY(${turns[i]}deg)` }}>
                  <div
                    className={styles.hotLayer}
                    style={{ animation: hoverIndex === i ? 'cardSwayHot 3.2s ease-in-out 2.2s infinite' : 'none' }}
                  >
                    <div
                      className={styles.swayLayer}
                      style={{ animation: `cardSway ${(4.8 + i * 0.6).toFixed(2)}s ease-in-out ${(-i * 1.6).toFixed(2)}s infinite alternate` }}
                    >
                      <img src={d.img} alt={d.name} className={styles.front} draggable={false} />
                      {MID_LAYER_DEPTHS.map((z) => (
                        <div
                          key={z}
                          aria-hidden="true"
                          className={styles.layer}
                          style={{ transform: `translateZ(${-z}px)`, background: '#8A6A42', mask, WebkitMask: mask }}
                        />
                      ))}
                      <div
                        aria-hidden="true"
                        className={styles.layer}
                        style={{ transform: `translateZ(${-BACK_LAYER_DEPTH}px)`, background: '#B88F5C', mask, WebkitMask: mask }}
                      />
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
