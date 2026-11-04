import { useEffect, useRef, useState } from "react";

const LINES = ["Você. Do jeito", "que você gosta."];

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
  heroImageSrc: string;
}

export function Hero({ heroImageSrc }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const measureRef = useRef<HTMLSpanElement>(null);
  const heroTextRef = useRef<HTMLHeadingElement>(null);
  const heroImgRef = useRef<HTMLDivElement>(null);
  const [fontSizes, setFontSizes] = useState<number[] | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function measureWidthAt(line: string, fontSize: number): number {
      const span = measureRef.current;
      if (!span) return 0;
      span.style.fontSize = `${fontSize}px`;
      span.textContent = line;
      return span.getBoundingClientRect().width;
    }

    function measure() {
      const span = measureRef.current;
      if (!span) return;
      const widths = LINES.map((line) => measureWidthAt(line, 100));
      const maiorLargura = Math.max(...widths);
      const compact = window.innerWidth <= 760;
      const tablet = window.innerWidth <= 1100 && window.innerWidth >= 761;

      // Largura real disponivel dentro do padding horizontal do titulo
      // (.pubcat-hero-title: padding 0 clamp(20px,4vw,56px)) - usada no
      // desktop para deixar o titulo bem maior sem estourar o container.
      const horizontalPadding = Math.min(56, Math.max(20, window.innerWidth * 0.04));
      const availableWidth = window.innerWidth - horizontalPadding * 2;

      const targetLineWidth = compact
        ? Math.min(availableWidth * 0.98, window.innerWidth * 0.8)
        : tablet
          ? window.innerWidth * 0.76
          : Math.min(availableWidth * 0.94, 1700);
      const base = (targetLineWidth / maiorLargura) * 100;
      const heightRatio = compact ? 0.62 : tablet ? 0.62 : 0.74;
      const cap = Math.min(base, (window.innerHeight * heightRatio) / (LINES.length * 1.02));
      const targetWidth = (cap / 100) * maiorLargura;

      const sizes = LINES.map((line, i) => {
        const balanceCeiling = cap * (compact ? 1.02 : tablet ? 1.05 : 1.16);
        // Trava de seguranca: nenhuma linha pode passar da largura disponivel,
        // mesmo quando o multiplicador de balanceamento acima permitiria.
        const containerCeiling = (availableWidth / widths[i]) * 100;
        const ceiling = Math.min(balanceCeiling, containerCeiling);
        let fontSize = Math.min((cap * maiorLargura) / widths[i], ceiling);
        if (fontSize < ceiling) {
          // Correcao: a projecao linear a partir da medida em 100px acumula um
          // pequeno erro de arredondamento em strings longas; uma segunda
          // medida no tamanho final ajusta a linha para a largura-alvo exata,
          // alinhando as pontas das linhas com precisao.
          const actualWidth = measureWidthAt(line, fontSize);
          if (actualWidth > 0) {
            fontSize = Math.min(fontSize * (targetWidth / actualWidth), ceiling);
          }
        }
        return fontSize;
      });
      span.style.fontSize = "100px";
      if (!cancelled) setFontSizes(sizes);
    }

    document.fonts.ready.then(() => {
      if (cancelled) return;
      measure();
      setTimeout(() => {
        if (!cancelled) setReady(true);
      }, 80);
    });

    window.addEventListener("resize", measure);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Parallax escrito direto no DOM via refs (sem setState por quadro) para
  // nao re-renderizar o React a cada scroll.
  useEffect(() => {
    if (reducedMotion) return;

    let raf: number | null = null;

    function update() {
      raf = null;
      const y = window.scrollY;
      const compact = window.matchMedia("(max-width: 760px)").matches;
      const textLift = compact ? 0.1 : 0.28;
      const fadeDistance = compact ? 380 : 700;

      const text = heroTextRef.current;
      if (text) {
        text.style.transform = `translateY(${y * textLift}px)`;
        text.style.opacity = String(Math.max(0, 1 - y / fadeDistance));
      }

      const img = heroImgRef.current;
      if (img) {
        const zoom = 1.08 - Math.min(y / (compact ? 1400 : 900), 1) * 0.08;
        img.style.transform = `scale(${zoom}) translateY(${y * (compact ? -0.02 : -0.04)}px)`;
      }
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

  return (
    <section className={`pubcat-hero${ready || reducedMotion ? " is-in" : ""}${reducedMotion ? " no-motion" : ""}`}>
      <span ref={measureRef} className="hero-measure" aria-hidden="true" />
      <h1 ref={heroTextRef} className="pubcat-hero-title">
        {fontSizes
          ? LINES.map((line, i) => (
              <span className="hero-line-mask" key={line}>
                <span
                  className="hero-line-inner"
                  style={{
                    fontSize: `${fontSizes[i]}px`,
                    transitionDelay: reducedMotion ? undefined : `${0.1 + i * 0.12}s`,
                  }}
                >
                  {line}
                </span>
              </span>
            ))
          : null}
      </h1>

      <div className="pubcat-hero-image-wrapper">
        <div className="pubcat-hero-image">
          <div ref={heroImgRef} className="pubcat-hero-image-layer">
            <img src={heroImageSrc} alt="" fetchPriority="high" />
          </div>
        </div>
      </div>
    </section>
  );
}
