import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatPrice } from "../../lib/format";
import { CLINIC_NAME } from "../../config/clinic";
import type { CatalogItem } from "./catalogItems";
import { useCompactViewport } from "./useCompactViewport";

const NAV_STOPS = ["Capa", "Sobre e valores", "Agendar", "Contracapa"];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

interface Props {
  items: CatalogItem[];
  activeIndex: number;
  onClose: () => void;
  onChangeItem: (index: number) => void;
  onOpenLeadForm: (categoryName: string) => void;
  whatsappHref: (message: string) => string;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}

function measurePage(compact: boolean): { pageW: number; pageH: number } {
  if (typeof window === "undefined") return { pageW: 320, pageH: 448 };
  if (!compact) {
    const pageW = Math.floor(
      Math.min(420, (window.innerWidth - 64) / 2, (window.innerHeight - 190) / 1.4),
    );
    return { pageW, pageH: Math.floor(pageW * 1.4) };
  }
  const pageW = Math.floor(Math.min(420, (window.innerWidth - 16) / 2));
  const pageH = Math.floor(Math.min(window.innerHeight - 168, Math.max(pageW * 1.4, 400)));
  return { pageW, pageH };
}

function usePageSize(compact: boolean) {
  const [size, setSize] = useState(() => measurePage(compact));
  useEffect(() => {
    function compute() {
      setSize(measurePage(compact));
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [compact]);
  return size;
}

function splitStory(
  description: string | null,
  fallbackName: string,
): { title: string; text: string } {
  if (!description) return { title: fallbackName, text: "" };
  const idx = description.indexOf("\n");
  if (idx === -1) return { title: description, text: "" };
  return { title: description.slice(0, idx).trim(), text: description.slice(idx + 1).trim() };
}

export function Booklet({
  items,
  activeIndex,
  onClose,
  onChangeItem,
  onOpenLeadForm,
  whatsappHref,
  returnFocusRef,
}: Props) {
  const item = items[activeIndex];
  const reducedMotion = usePrefersReducedMotion();
  const compact = useCompactViewport();
  const DUR = reducedMotion ? 300 : 1100;

  const { pageW, pageH } = usePageSize(compact);
  const maxFlip = NAV_STOPS.length - 1;
  const [flip, setFlip] = useState(0);
  const [moving, setMoving] = useState(-1);
  const movingTimerRef = useRef<number | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageDrag = useRef({ x: 0, y: 0, id: -1, on: false });
  const turnGuard = useRef(false);
  const [visible, setVisible] = useState(false);
  const [openedProcedureId, setOpenedProcedureId] = useState(item?.procedureId);
  const [coverSwapping, setCoverSwapping] = useState(false);
  const hasOpenedRef = useRef(false);
  const COVER_FADE = reducedMotion ? 120 : 220;

  // Reseta a volta da capa quando o procedimento muda (inclusive na primeira montagem).
  if (item && item.procedureId !== openedProcedureId) {
    setOpenedProcedureId(item.procedureId);
    setFlip(0);
  }

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 10);
    return () => window.clearTimeout(t);
  }, []);

  const requestClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(onClose, 600);
  }, [onClose]);

  const flipTo = useCallback(
    (f: number) => {
      if (f < 0 || f > maxFlip || f === flip) return;
      setMoving(f > flip ? flip : f);
      setFlip(f);
      if (movingTimerRef.current) window.clearTimeout(movingTimerRef.current);
      movingTimerRef.current = window.setTimeout(() => setMoving(-1), DUR);
    },
    [flip, DUR, maxFlip],
  );

  // Abre na capa; depois de 700ms (ou 350ms ao trocar de procedimento), vira
  // sozinho para a primeira página de conteúdo.
  useEffect(() => {
    const delay = hasOpenedRef.current ? 350 : 700;
    hasOpenedRef.current = true;
    const t = window.setTimeout(() => {
      setMoving(0);
      setFlip(1);
      if (movingTimerRef.current) window.clearTimeout(movingTimerRef.current);
      movingTimerRef.current = window.setTimeout(() => setMoving(-1), DUR);
    }, delay);
    return () => window.clearTimeout(t);
  }, [openedProcedureId, DUR]);

  function goToItem(index: number) {
    const looped = (index + items.length) % items.length;
    const wasOpen = flip !== 0;
    if (wasOpen) flipTo(0);
    // Troca o conteudo só quando o livro está totalmente fechado (ou, se já
    // estava fechado, após um esmaecer rápido) - nunca no meio do giro 3D,
    // que é o que fazia a capa "piscar" para o novo procedimento.
    const swapAt = wasOpen ? DUR : COVER_FADE;
    window.setTimeout(() => setCoverSwapping(true), Math.max(0, swapAt - COVER_FADE));
    window.setTimeout(() => {
      onChangeItem(looped);
      requestAnimationFrame(() => setCoverSwapping(false));
    }, swapAt);
  }

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previouslyFocused = returnFocusRef.current;
    return () => {
      previouslyFocused?.focus();
    };
  }, [returnFocusRef]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        flipTo(flip + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        flipTo(flip - 1);
        return;
      }
      if (event.key === "Tab") {
        const root = overlayRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [flip, flipTo, requestClose]);

  // No mobile, a capa fechada ocupa a mesma largura do miolo aberto (as duas
  // paginas lado a lado) em vez de só uma pagina - por isso nao precisa do
  // deslocamento que recentraliza uma pagina unica dentro do livro de 2 paginas.
  const coverFull = compact && flip === 0;
  const shift = coverFull ? 0 : flip === 0 ? -pageW / 2 : flip === maxFlip ? pageW / 2 : 0;

  function rotateFor(i: number): string {
    return flip > i ? "rotateY(-180deg)" : "rotateY(0deg)";
  }

  function zIndexFor(i: number): number {
    if (i === moving) return 30;
    return flip > i ? i + 1 : 24 - i;
  }

  function onStagePointerDown(event: React.PointerEvent) {
    if (!compact) return;
    if ((event.target as HTMLElement).closest("a,button")) return;
    stageDrag.current = { x: event.clientX, y: event.clientY, id: event.pointerId, on: true };
  }

  function onStagePointerUp(event: React.PointerEvent) {
    const drag = stageDrag.current;
    if (!drag.on || drag.id !== event.pointerId) return;
    drag.on = false;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) < 34 || Math.abs(dx) < Math.abs(dy)) return;
    turnGuard.current = true;
    flipTo(flip + (dx < 0 ? 1 : -1));
  }

  function sheetClick(i: number, event: React.MouseEvent) {
    if (turnGuard.current) {
      turnGuard.current = false;
      return;
    }
    if ((event.target as HTMLElement).closest("a,button")) return;
    flipTo(flip > i ? i : i + 1);
  }

  if (!item) return null;

  const activeVariations = item.variations;
  const manyVariations = activeVariations.length > 8;
  const detailImage = item.detailImageUrl ?? item.coverImageUrl ?? null;
  const story = splitStory(item.description, item.name);
  const pageNumber = String(activeIndex + 1).padStart(2, "0");

  const introParagraph =
    "Conheça os procedimentos disponíveis e converse com nossa equipe para encontrar o cuidado adequado para você.";

  return createPortal(
    <div
      className={`booklet-overlay${visible ? " is-visible" : ""}${compact ? " is-compact" : ""}`}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Catálogo: ${item.name}`}
    >
      <div className="booklet-topbar">
        <span className="booklet-eyebrow">
          Nº {String(activeIndex + 1).padStart(2, "0")} · {item.categoryName}
        </span>
        <button
          type="button"
          className="booklet-close"
          ref={closeButtonRef}
          onClick={requestClose}
          aria-label="Fechar catálogo"
        >
          Fechar ×
        </button>
      </div>

      <div
        className="booklet-stage"
        onPointerDown={onStagePointerDown}
        onPointerUp={onStagePointerUp}
        onPointerCancel={onStagePointerUp}
      >
        <div
          className="booklet-book"
          style={{ width: pageW * 2, height: pageH, transform: `translateX(${shift}px)` }}
        >
          {/* Folha 0: Capa / Historia */}
          <div
            className="book-sheet"
            style={{ zIndex: zIndexFor(0), transform: rotateFor(0) }}
            onClick={(e) => sheetClick(0, e)}
          >
            <div
              className={`book-face book-face--cover${coverFull ? " book-face--cover-full" : ""}`}
              style={{
                opacity: coverSwapping ? 0 : 1,
                transition: `opacity ${COVER_FADE}ms ease`,
              }}
            >
              <div className="book-face-top">
                <span>Nº {pageNumber}</span>
                <span>{item.categoryName}</span>
              </div>
              {item.coverImageUrl ? (
                <img className="book-cover-image" src={item.coverImageUrl} alt="" />
              ) : (
                <div className="book-cover-image book-cover-image--empty" />
              )}
              <div className="book-face-name">{item.name}</div>
              <div className="book-face-footer">
                <span>{CLINIC_NAME}</span>
                <span>Catálogo de procedimentos</span>
              </div>
            </div>
            <div className="book-face book-face--back book-page book-page--left book-story">
              <div className="book-story-top">
                <span className="booklet-label">{item.name}</span>
                <span className="book-story-number">{pageNumber}</span>
              </div>
              <div className="book-story-center">
                <span className="book-story-rule" aria-hidden="true" />
                <h3 className="book-story-title">{story.title}</h3>
                {story.text ? <p className="book-story-text">{story.text}</p> : null}
              </div>
              <span className="book-page-number">2</span>
            </div>
          </div>

          {/* Folha 1: Valores / Foto de detalhe */}
          <div
            className="book-sheet"
            style={{ zIndex: zIndexFor(1), transform: rotateFor(1) }}
            onClick={(e) => sheetClick(1, e)}
          >
            <div className="book-face book-page book-page--right book-values">
              <span className="booklet-label">Valores</span>
              <div className="book-values-top">
                <span>A partir de</span>
                <b>{formatPrice(item.displayPrice)}</b>
              </div>
              {activeVariations.length > 0 ? (
                <div className={`book-values-table${manyVariations ? " book-values-table--compact" : ""}`}>
                  {activeVariations.map((variation) => (
                    <div className="book-values-row" key={variation.id}>
                      <span>
                        {variation.groupName ? `${variation.groupName} — ` : ""}
                        {variation.name}
                        {variation.reference ? ` (${variation.reference})` : ""}
                      </span>
                      <b>{formatPrice(variation.price)}</b>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="book-values-footer">
                <p className="book-page-note">Procedimento personalizado conforme avaliação profissional.</p>
                <span className="book-page-number">3</span>
              </div>
            </div>
            <div className="book-face book-face--back book-page-photo">
              {detailImage ? <img src={detailImage} alt="" /> : <div className="book-page-photo--empty" />}
            </div>
          </div>

          {/* Folha 2: Agendar / Contracapa */}
          <div
            className="book-sheet"
            style={{ zIndex: zIndexFor(2), transform: rotateFor(2) }}
            onClick={(e) => sheetClick(2, e)}
          >
            <div className="book-face book-page book-page--right book-agendar">
              <span className="booklet-label">Agendar</span>
              <h3 className="book-page-title">Converse com nossa equipe.</h3>
              <p className="book-page-text">{introParagraph}</p>
              <div className="book-page-actions">
                <button
                  type="button"
                  className="book-button book-button--solid"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenLeadForm(item.categoryName);
                  }}
                >
                  Agendar avaliação →
                </button>
                <a
                  className="book-button book-button--outline"
                  href={whatsappHref(`Olá! Quero saber mais sobre ${item.name}.`)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  Falar no WhatsApp →
                </a>
              </div>
              <span className="book-page-number">5</span>
            </div>
            <div className="book-face book-face--back book-backcover">
              <span className="book-backcover-name">{CLINIC_NAME}</span>
              <span className="book-backcover-sub">Catálogo de procedimentos</span>
            </div>
          </div>
        </div>
      </div>

      <div className="booklet-bottombar">
        <button
          type="button"
          className="booklet-side-nav"
          aria-label="Procedimento anterior"
          onClick={() => goToItem(activeIndex - 1)}
        >
          ← {items[(activeIndex - 1 + items.length) % items.length].name}
        </button>
        <nav className="booklet-stops" aria-label="Páginas do catálogo">
          {NAV_STOPS.map((label, i) => (
            <button
              type="button"
              key={label}
              className={i === flip ? "is-active" : ""}
              aria-current={i === flip ? "true" : undefined}
              onClick={() => flipTo(i)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="booklet-side-nav"
          aria-label="Próximo procedimento"
          onClick={() => goToItem(activeIndex + 1)}
        >
          {items[(activeIndex + 1) % items.length].name} →
        </button>
      </div>
    </div>,
    document.body,
  );
}
