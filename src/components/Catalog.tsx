import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import { CATALOG_ITEMS, soften } from '../data/catalog';
import type { CatalogItem } from '../data/catalog';
import { DetailPage } from './DetailPage';
import { tearPage } from '../lib/paperTear';
import { useBooking } from '../context/BookingContext';
import textura from '../assets/images/booking-paper-grain.svg';
import styles from './Catalog.module.css';

const N = CATALOG_ITEMS.length;
const FACE_W = 240;
const RING_RADIUS = Math.round(FACE_W / 2 / Math.tan(Math.PI / N)) + 4;
const DRAG_FACTOR = 0.35;
const STEP_ANGLE = 360 / N;
// Capped below one full step so a swipe of any length always leaves a visible
// distance for the release animation to settle through (the "spin" never collapses to zero).
const TOUCH_DRAG_CLAMP = STEP_ANGLE * 0.75;

interface CtaGroupProps {
  onBook: (e: ReactMouseEvent<HTMLAnchorElement>) => void;
  onLearnMore: () => void;
  className?: string;
}

function CtaGroup({ onBook, onLearnMore, className }: CtaGroupProps) {
  return (
    <div className={`${styles.ctaGroup} ${className ?? ''}`}>
      <a href="#agendar" className={styles.bookButton} onClick={onBook}>
        BOOK NOW
      </a>
      <button type="button" className={styles.learnMore} onClick={onLearnMore}>
        Saiba mais
      </button>
    </div>
  );
}

export function Catalog() {
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);

  const [zoomed, setZoomed] = useState(false);
  const [compactScale, setCompactScale] = useState(.65);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const moved = useRef(false);
  const touchGesture = useRef(false);

  const [detailItem, setDetailItem] = useState<CatalogItem | null>(null);
  const { openBook } = useBooking();

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(() => {
      // 430px includes the widest projected ring angle and a small safety margin.
      setCompactScale(Math.min(.9, Math.max(.1, (viewport.clientWidth - 8) / 430)));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

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
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.pointerType === 'mouse') e.preventDefault();
    touchGesture.current = e.pointerType === 'touch';
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
    moved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setDrag(0);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - (dragStartY.current ?? e.clientY);
    if (Math.hypot(dx, dy) > 8) moved.current = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      const rotation = dx * (touchGesture.current ? .7 : DRAG_FACTOR);
      setDrag(touchGesture.current ? Math.max(-TOUCH_DRAG_CLAMP, Math.min(TOUCH_DRAG_CLAMP, rotation)) : rotation);
    }
  };

  const clearDrag = () => {
    dragStartX.current = null;
    dragStartY.current = null;
    setDrag(0);
    setDragging(false);
  };

  const handlePointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - (dragStartY.current ?? e.clientY);
    const horizontal = moved.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > (touchGesture.current ? 14 : 12);
    if (horizontal) {
      const steps = touchGesture.current ? (dx < 0 ? 1 : -1) : -Math.round((dx * DRAG_FACTOR) / (360 / N)) || (dx < 0 ? 1 : -1);
      setStep((s) => s + steps);
    } else if (!moved.current) {
      if (window.matchMedia('(max-width: 640px)').matches) setZoomed((value) => !value);
      else setStep((s) => s + 1);
    }
    clearDrag();
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
        style={{ backgroundImage: `url("${textura}")` }}
      />

      <div className={styles.inner}>
        <div className={styles.carouselColumn}>
          <div className={styles.carouselDisplay}>
          <div
            ref={viewportRef}
            className={`${styles.ringViewport} ${zoomed ? styles.zoomed : ''}`}
            style={{ '--catalog-compact-scale': compactScale } as CSSProperties}
            data-catalog-zoomed={zoomed}
            role="group"
            aria-label="Carrossel de procedimentos"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={clearDrag}
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

          <div className={styles.zoomControls}>
            <button type="button" className={styles.zoomToggle} aria-label={zoomed ? 'Reduzir carrossel' : 'Ampliar carrossel'} aria-pressed={zoomed} onClick={() => setZoomed((value) => !value)}>{zoomed ? '− reduzir' : '+ ampliar'}</button>
            <span>arraste para girar</span>
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

          <CtaGroup
            className={styles.ctaCarousel}
            onBook={(e) => {
              e.preventDefault();
              openBook(active);
            }}
            onLearnMore={() => openDetail(current)}
          />
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
            <span className={styles.price}>
              {current.price.split('R$')[0].trim()}{' '}
              <span className={styles.priceValue}>R$ {current.price.split('R$')[1]?.trim()}</span>
            </span>
            <CtaGroup
              className={styles.ctaInfo}
              onBook={(e) => {
                e.preventDefault();
                openBook(active);
              }}
              onLearnMore={() => openDetail(current)}
            />
          </div>
        </div>
      </div>

      {detailItem && <DetailPage item={detailItem} onClose={closeDetail} withTear />}
    </section>
  );
}
