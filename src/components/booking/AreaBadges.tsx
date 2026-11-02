import { useEffect, useRef, useState } from 'react';
import styles from './MobileCards.module.css';

export function AreaBadges({ areas, onRemove }: { areas: string[]; onRemove: (area: string) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ previous: false, next: false });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => {
      const overflow = element.scrollWidth > (element.parentElement?.clientWidth ?? element.clientWidth) + 1;
      const previous = overflow && element.scrollLeft > 1;
      const next = overflow && element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
      setEdges((old) => old.previous === previous && old.next === next ? old : { previous, next });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    for (const child of element.children) observer.observe(child);
    element.addEventListener('scroll', update, { passive: true });
    const frame = requestAnimationFrame(update);
    return () => { observer.disconnect(); element.removeEventListener('scroll', update); cancelAnimationFrame(frame); };
  }, [areas]);
  const overflow = edges.previous || edges.next;
  const scroll = (direction: number) => {
    const element = viewport.current;
    if (!element) return;
    element.scrollBy({ left: direction * Math.max(70, element.clientWidth * .8), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  if (areas.length === 0) return null;
  return (
    <div className={`${styles.areaBadges} ${overflow ? styles.areaBadgesOverflow : ''}`} role="group" aria-label="Áreas selecionadas">
      {overflow && <button type="button" className={styles.areaArrow} aria-label="Ver áreas anteriores" disabled={!edges.previous} onClick={() => scroll(-1)}>‹</button>}
      <div ref={viewport} className={styles.areaViewport} tabIndex={overflow ? 0 : undefined} aria-label="Deslize para ver as áreas selecionadas">
        {areas.map((area) => <button key={area} type="button" className={styles.areaBadge} aria-label={`Remover área ${area}`} onClick={() => onRemove(area)}>{area} <span aria-hidden="true">×</span></button>)}
      </div>
      {overflow && <button type="button" className={styles.areaArrow} aria-label="Ver próximas áreas" disabled={!edges.next} onClick={() => scroll(1)}>›</button>}
    </div>
  );
}
