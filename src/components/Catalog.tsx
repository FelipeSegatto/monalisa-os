import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { CATALOG_ITEMS, soften } from '../data/catalog';
import type { CatalogItem } from '../data/catalog';
import { DetailPage } from './DetailPage';
import { tearPage } from '../lib/paperTear';
import textura from '../assets/images/textura-papel.png';
import styles from './Catalog.module.css';

const N = CATALOG_ITEMS.length;
const FACE_W = 240;
const RING_RADIUS = Math.round(FACE_W / 2 / Math.tan(Math.PI / N)) + 4;
const DRAG_FACTOR = 0.35;

export function Catalog() {
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);

  const dragStartX = useRef<number | null>(null);
  const moved = useRef(false);

  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null);

  const active = ((step % N) + N) % N;
  const current = CATALOG_ITEMS[active];

  const openDetail = (item: CatalogItem) => {
    tearPage(() => {
      document.body.style.overflow = 'hidden';
      setDetailItem(item);
    });
  };

  const closeDetail = () => {
    document.body.style.overflow = '';
    setDetailItem(null);
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setDrag(0);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 5) moved.current = true;
    setDrag(dx * DRAG_FACTOR);
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = null;

    const steps = moved.current
      ? -Math.round((dx * DRAG_FACTOR) / (360 / N)) || (Math.abs(dx) > 30 ? (dx < 0 ? 1 : -1) : 0)
      : 1;

    setStep((s) => s + steps);
    setDrag(0);
    setDragging(false);
  };

  const goTo = (index: number) => {
    setStep((s) => {
      const a = ((s % N) + N) % N;
      let delta = index - a;
      if (delta > N / 2) delta -= N;
      if (delta < -N / 2) delta += N;
      return s + delta;
    });
  };

  const ringTransform = `translateY(-10px) translateZ(${-RING_RADIUS}px) rotateX(-14deg) rotateY(${-step * (360 / N) + drag}deg)`;
  const ringTransition = dragging ? 'none' : 'transform .9s cubic-bezier(.6,.05,.25,1)';

  return (
    <section
      id="catalogo"
      className={styles.catalog}
      style={{ background: soften(current.bg), color: current.ink }}
    >
      <div
        aria-hidden="true"
        className={styles.texture}
        style={{ backgroundImage: `url(${textura})` }}
      />

      <div className={styles.inner}>
        <div className={styles.carouselColumn}>
          <div
            className={styles.ringViewport}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <div
              className={styles.ring}
              style={{ transform: ringTransform, transition: ringTransition }}
            >
              {CATALOG_ITEMS.map((item, i) => (
                <div
                  key={item.name}
                  className={styles.face}
                  style={{
                    transform: `rotateY(${i * (360 / N)}deg) translateZ(${RING_RADIUS}px)`,
                    background: soften(item.face),
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className={styles.faceImg}
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => setStep((s) => s - 1)}
              aria-label="Procedimento anterior"
            >
              ←
            </button>
            <div className={styles.dots}>
              {CATALOG_ITEMS.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  className={styles.dot}
                  style={{ background: i === active ? '#161515' : '#fefefe' }}
                  aria-label={item.name}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => setStep((s) => s + 1)}
              aria-label="Próximo procedimento"
            >
              →
            </button>
          </div>
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.counter}>catálogo · {active + 1}/{N}</div>

          <div className={styles.titleWrap}>
            <svg width="0" height="0" className={styles.filterDefs} aria-hidden="true">
              <filter id="roughHL" x="-10%" y="-20%" width="120%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={7} result="t" />
                <feDisplacementMap in="SourceGraphic" in2="t" scale={8} xChannelSelector="R" yChannelSelector="G" result="d" />
                <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves={2} seed={3} result="g" />
                <feColorMatrix
                  in="g"
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.75"
                  result="m"
                />
                <feComposite in="d" in2="m" operator="in" />
              </filter>
            </svg>
            <h2
              aria-hidden="true"
              className={styles.titleHighlight}
              style={{ color: soften(current.accent), WebkitTextStroke: `12px ${soften(current.accent)}` }}
            >
              {current.name}
            </h2>
            <h2 className={styles.title}>{current.name}</h2>
          </div>

          <p className={styles.description}>{current.desc}</p>

          <div className={styles.priceRow}>
            <span className={styles.price}>{current.price}</span>
            <div className={styles.ctaGroup}>
              <a href="#agendar" className={styles.bookButton}>
                BOOK NOW
              </a>
              <button type="button" className={styles.learnMore} onClick={() => openDetail(current)}>
                Saiba mais
              </button>
            </div>
          </div>
        </div>
      </div>

      {detailItem && <DetailPage item={detailItem} onClose={closeDetail} withTear />}
    </section>
  );
}
