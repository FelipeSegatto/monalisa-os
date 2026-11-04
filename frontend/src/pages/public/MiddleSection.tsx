import { useEffect, useRef, useState } from "react";

const REVEAL_PHOTO = "/modelo-clinica.jpg";

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

interface RevealAnim {
  from: number;
  to: number;
  t0: number;
  dur: number;
}

interface RevealVector {
  x: number;
  y: number;
  r: number;
  tx: number;
  ty: number;
  tr: number;
  anim: RevealAnim | null;
}

function easeInOutCubic(k: number): number {
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
}

export function MiddleSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Deslocamento do marquee acompanhando o scroll - gravado direto no DOM via
  // custom property (--m), sem setState, para nao re-renderizar a cada quadro.
  useEffect(() => {
    if (reducedMotion) return;
    let raf: number | null = null;

    function update() {
      raf = null;
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const m = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (rect.height + window.innerHeight)));
      section.style.setProperty("--m", m.toFixed(4));
    }

    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  // Circulo que revela a cor: estado mutavel fora do React (sem setState por
  // quadro), igual ao padrao ja usado no Hero para o parallax.
  const rv = useRef<RevealVector>({ x: 0.5, y: 0.45, r: 0, tx: 0.5, ty: 0.45, tr: 0, anim: null });
  const rvRaf = useRef<number | null>(null);

  useEffect(() => () => {
    if (rvRaf.current) cancelAnimationFrame(rvRaf.current);
  }, []);

  function kick() {
    if (rvRaf.current) return;
    const step = () => {
      const v = rv.current;
      const el = revealRef.current;
      v.x += (v.tx - v.x) * 0.16;
      v.y += (v.ty - v.y) * 0.16;
      if (v.anim) {
        const k = Math.min(1, (performance.now() - v.anim.t0) / v.anim.dur);
        v.r = v.anim.from + (v.anim.to - v.anim.from) * easeInOutCubic(k);
        if (k >= 1) {
          v.r = v.tr = v.anim.to;
          v.anim = null;
        }
      } else {
        v.r += (v.tr - v.r) * 0.1;
      }
      if (el) {
        el.style.setProperty("--rx", `${(v.x * 100).toFixed(2)}%`);
        el.style.setProperty("--ry", `${(v.y * 100).toFixed(2)}%`);
        el.style.setProperty("--rr", `${(v.r * el.offsetWidth).toFixed(1)}px`);
      }
      const done =
        !v.anim && Math.abs(v.tx - v.x) < 0.001 && Math.abs(v.ty - v.y) < 0.001 && Math.abs(v.tr - v.r) < 0.001;
      rvRaf.current = done ? null : requestAnimationFrame(step);
    };
    rvRaf.current = requestAnimationFrame(step);
  }

  function point(event: React.PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    rv.current.tx = (event.clientX - bounds.left) / bounds.width;
    rv.current.ty = (event.clientY - bounds.top) / bounds.height;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    point(event);
    rv.current.tr = 0.28;
    kick();
  }

  function handlePointerLeave(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    rv.current.tr = 0;
    kick();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    point(event);
    const to = rv.current.tr > 0.5 ? 0 : 1.4;
    rv.current.tr = to;
    rv.current.anim = { from: rv.current.r, to, t0: performance.now(), dur: to ? 4000 : 1000 };
    kick();
  }

  return (
    <section ref={sectionRef} className="pubcat-middle" aria-label="A clínica">
      <div className="pubcat-middle-inner">
        <div className="pubcat-middle-top">
          <span>A clínica</span>
          <span>Cuidado, escuta e escolha</span>
        </div>

        <div className="pubcat-marquee">
          <div className="pubcat-marquee-lines">
            <div className="pubcat-marquee-line pubcat-marquee-line-1">
              Autoestima — Cuidado — Leveza — Autoestima — Cuidado — Leveza —
            </div>
            <div className="pubcat-marquee-line pubcat-marquee-line-2">
              no seu tempo — do seu jeito — no seu tempo — do seu jeito —
            </div>
          </div>
        </div>

        <div className="pubcat-reveal-heading">
          <span className="pubcat-reveal-label">Ver de novo</span>
          <h2 className="pubcat-reveal-title">
            Tudo muda quando você se vê <em>diferente.</em>
          </h2>
        </div>

        <div
          ref={revealRef}
          className="pubcat-reveal"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerUp={handlePointerUp}
        >
          <img className="pubcat-reveal-base" src={REVEAL_PHOTO} alt="" />
          <img
            className="pubcat-reveal-color"
            src={REVEAL_PHOTO}
            alt="Mulher de olhos fechados com as mãos no rosto"
          />
          <div className="pubcat-reveal-overlay">
            <h2 className="pubcat-reveal-title">
              Tudo muda quando você se vê <em>diferente.</em>
            </h2>
            <span className="pubcat-reveal-overlay-hint">Passe o cursor sobre a imagem</span>
          </div>
        </div>

        <div className="pubcat-reveal-touch-hint">
          <span className="pubcat-reveal-touch-hint-bar" />
          Toque na imagem
        </div>
      </div>
    </section>
  );
}
