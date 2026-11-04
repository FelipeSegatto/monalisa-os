import { useEffect, useRef, useState } from "react";
import { formatPrice } from "../../lib/format";
import type { CatalogItem } from "./catalogItems";
import { useCompactViewport } from "./useCompactViewport";

interface Props {
  items: CatalogItem[];
  onOpen: (index: number, trigger: HTMLElement) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function useCardWidth(): number {
  const [width, setWidth] = useState(370);
  useEffect(() => {
    function compute() {
      const w = window.innerWidth;
      if (w <= 760) setWidth(Math.round(w * 0.72));
      else if (w <= 1100) setWidth(320);
      else setWidth(370);
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return width;
}

export function CatalogCarousel({ items, onOpen }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [metrics, setMetrics] = useState({ passo: 0, wrapperHeight: 0 });
  const compact = useCompactViewport();
  const cardW = useCardWidth();
  const gap = cardW <= 320 ? 26 : 44;
  const n = items.length;
  const active = Math.round(pos);

  useEffect(() => {
    function computeMetrics() {
      const vh = window.innerHeight;
      const passo = n <= 6 ? 0.75 * vh : Math.max(0.4 * vh, (0.75 * vh * 6) / n);
      setMetrics({ passo, wrapperHeight: vh + (n - 1) * passo });
    }
    computeMetrics();
    window.addEventListener("resize", computeMetrics);
    return () => window.removeEventListener("resize", computeMetrics);
  }, [n]);

  useEffect(() => {
    if (!compact) return;
    setPos((current) => Math.round(current));
  }, [compact]);

  useEffect(() => {
    if (compact) return;
    let raf = 0;
    function update() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const scrollable = wrapper.offsetHeight - window.innerHeight;
      const p = scrollable > 0 ? clamp(-rect.top / scrollable, 0, 1) : 0;
      const next = p * Math.max(n - 1, 0);
      setPos((prev) => (Math.abs(next - prev) > 0.001 ? next : prev));
    }
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }
    raf = requestAnimationFrame(update);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [compact, n, metrics.wrapperHeight]);

  function scrollToIndex(i: number) {
    const next = clamp(Math.round(i), 0, Math.max(n - 1, 0));
    if (compact) {
      setPos(next);
      return;
    }
    const wrapper = wrapperRef.current;
    if (!wrapper || n <= 1) return;
    const top = wrapper.getBoundingClientRect().top + window.scrollY;
    const target = top + (next / (n - 1)) * (metrics.wrapperHeight - window.innerHeight) + 1;
    window.scrollTo({ top: target, behavior: "smooth" });
  }

  // Coluna de informacao: troca com fade.
  const [displayIndex, setDisplayIndex] = useState(active);
  const [fading, setFading] = useState(false);
  if (active !== displayIndex && !fading) {
    setFading(true);
  }
  useEffect(() => {
    if (active === displayIndex) return;
    const t = window.setTimeout(() => {
      setDisplayIndex(active);
      requestAnimationFrame(() => setFading(false));
    }, 260);
    return () => window.clearTimeout(t);
  }, [active, displayIndex]);

  const infoItem = items[displayIndex] ?? items[0];

  // Drag do trilho.
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, dragging: false, pointerId: -1 });
  const justDraggedRef = useRef(false);

  function onPointerDown(event: React.PointerEvent) {
    dragRef.current = { startX: event.clientX, dragging: false, pointerId: event.pointerId };
  }
  function onPointerMove(event: React.PointerEvent) {
    const state = dragRef.current;
    if (state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    if (!state.dragging && Math.abs(dx) > 22) {
      state.dragging = true;
      setIsDragging(true);
      (event.target as Element).setPointerCapture(event.pointerId);
    }
    if (state.dragging) setDragX(dx);
  }
  function onPointerUp(event: React.PointerEvent) {
    const state = dragRef.current;
    if (state.pointerId !== event.pointerId) return;
    if (state.dragging) {
      justDraggedRef.current = true;
      const dx = dragX;
      setDragX(0);
      setIsDragging(false);
      if (Math.abs(dx) > 60) {
        scrollToIndex(active + (dx < 0 ? 1 : -1));
      }
    }
    dragRef.current = { startX: 0, dragging: false, pointerId: -1 };
  }

  function handleCardClick(i: number, el: HTMLElement) {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    if (i === active) {
      onOpen(i, el);
    } else {
      scrollToIndex(i);
    }
  }

  const trackTransform = `translateX(${-pos * (cardW + gap) + dragX}px)`;

  return (
    <section id="catalogo" className={`pubcat-section${compact ? " is-compact" : ""}`}>
      <div className="pubcat-intro">
        <span className="pubcat-intro-label">O catálogo</span>
        <h2 className="pubcat-intro-title">
          Resultados que não passam
          <br />
          <em>despercebidos.</em>
        </h2>
        <p className="pubcat-intro-text">
          Conheça os procedimentos disponíveis e converse com nossa equipe para encontrar{" "}
          <br className="pubcat-intro-text-break" />
          o melhor tratamento para você.
        </p>
      </div>

      <div
        className={`pubcat-wrapper${compact ? " is-compact" : ""}`}
        ref={wrapperRef}
        style={compact ? undefined : { height: metrics.wrapperHeight || "100vh" }}
      >
        <div className="pubcat-sticky">
          <div className="pubcat-row">
            <div className={`pubcat-info${fading ? " is-fading" : ""}`}>
              <span className="pubcat-info-label">
                Nº {String(displayIndex + 1).padStart(2, "0")} · {infoItem?.categoryName}
              </span>
              <h3 className="pubcat-info-name">{infoItem?.name}</h3>
              {infoItem?.description ? <p className="pubcat-info-text">{infoItem.description}</p> : null}
              <div className="pubcat-info-divider" />
              <div className="pubcat-info-price">
                <span>A partir de</span>
                <b>{formatPrice(infoItem?.displayPrice ?? 0)}</b>
              </div>
              <button
                type="button"
                className="pubcat-info-open"
                onClick={(e) => onOpen(displayIndex, e.currentTarget)}
              >
                Abrir catálogo →
              </button>

              <div className="pubcat-info-footer">
                {n <= 8 ? (
                  <div className="pubcat-progress-segments">
                    {items.map((it, i) => (
                      <button
                        type="button"
                        key={it.procedureId}
                        className={i === active ? "is-active" : ""}
                        aria-label={`Ir para ${it.name}`}
                        onClick={() => scrollToIndex(i)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="pubcat-progress-bar">
                    <div className="pubcat-progress-bar-fill" style={{ width: `${((active + 1) / n) * 100}%` }} />
                  </div>
                )}

                <div className="pubcat-nav-row">
                  <span className="pubcat-counter">
                    {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                  </span>
                  <div className="pubcat-arrows">
                    <button
                      type="button"
                      aria-label="Procedimento anterior"
                      disabled={active <= 0}
                      onClick={() => scrollToIndex(active - 1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      aria-label="Próximo procedimento"
                      disabled={active >= n - 1}
                      onClick={() => scrollToIndex(active + 1)}
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="pubcat-trail"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <div
                className="pubcat-trail-track"
                ref={trackRef}
                style={{
                  transform: trackTransform,
                  transition: isDragging ? "none" : undefined,
                  gap,
                }}
              >
                {items.map((it, i) => {
                  const d = Math.abs(i - pos);
                  if (d > 4) {
                    return <div key={it.procedureId} className="pubcat-card-spacer" style={{ width: cardW }} />;
                  }
                  const scale = 1 - Math.min(d, 1) * 0.14;
                  const opacity = Math.max(i < pos ? 0.12 : 0.4, 1 - d * (i < pos ? 1.4 : 0.6));
                  return (
                    <button
                      type="button"
                      key={it.procedureId}
                      className="pubcat-card"
                      style={{ width: cardW, transform: `scale(${scale})`, opacity }}
                      onClick={(e) => handleCardClick(i, e.currentTarget)}
                    >
                      <div className="pubcat-card-top">
                        <span>Nº {String(i + 1).padStart(2, "0")}</span>
                        <span>{it.categoryName}</span>
                      </div>
                      {it.coverImageUrl ? (
                        <img
                          className="pubcat-card-image"
                          src={it.coverImageUrl}
                          alt=""
                          loading="lazy"
                          style={{ pointerEvents: i === active ? "auto" : "none" }}
                        />
                      ) : (
                        <div
                          className="pubcat-card-image pubcat-card-image--empty"
                          style={{ pointerEvents: i === active ? "auto" : "none" }}
                        />
                      )}
                      <div className="pubcat-card-bottom">
                        <span className="pubcat-card-name">{it.name}</span>
                        <span className="pubcat-card-tag">Catálogo</span>
                      </div>
                      <span className="pubcat-card-edge pubcat-card-edge--1" aria-hidden="true" />
                      <span className="pubcat-card-edge pubcat-card-edge--2" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              <p className="pubcat-trail-caption">
                {compact ? "Deslize · toque na capa para abrir" : "Role ou arraste · clique na capa para abrir"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
