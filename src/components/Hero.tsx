import { useEffect, useRef, useState } from 'react';
import type { Ref } from 'react';
import logoAmarelo from '../assets/images/logo-amarelo.webp';
import logoVermelho from '../assets/images/logo-vermelho.webp';
import logoAzul from '../assets/images/logo-azul.webp';
import logoRoxo from '../assets/images/logo-roxo.webp';
import logoRosa from '../assets/images/logo-rosa.webp';
import homemMusculoso from '../assets/images/homem-musculoso.webp';
import mulherPose from '../assets/images/mulher-pose-monalisa.svg';
import estrela from '../assets/images/estrela-monalisa.webp';
import styles from './Hero.module.css';

const PALETTE = [
  { color: '#F6B900', logo: logoAmarelo },
  { color: '#FF3B4E', logo: logoVermelho },
  { color: '#3A22E8', logo: logoAzul },
  { color: '#8650D8', logo: logoRoxo },
  { color: '#F93AA4', logo: logoRosa },
];

const MOBILE_QUERY = '(max-width: 640px)';
// Speeds are px/second.
const LOGO_SPEED_DESKTOP = 72;
const LOGO_SPEED_MOBILE = 40.3;
const MARQUEE_SPEED = 40;
const MAX_FRAME_DELTA_MS = 50;

const MARQUEE_COPIES = 6;

function MarqueeGroup({ groupRef }: { groupRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={groupRef} className={styles.trackGroup}>
      <span className={styles.word}>welcome</span>
      <div className={styles.illustrationWrap}>
        <img src={homemMusculoso} alt="" className={styles.illustrationBodybuilder} />
      </div>
      <span className={styles.word}>to</span>
      <div className={styles.illustrationWrap}>
        <img src={estrela} alt="" className={styles.illustrationStar} />
      </div>
      <span className={styles.word}>monalisa</span>
      <div className={styles.illustrationWrap}>
        <img src={mulherPose} alt="" className={styles.illustrationPinup} />
      </div>
    </div>
  );
}

export function Hero() {
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const logoSpeedRef = useRef(LOGO_SPEED_DESKTOP);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => {
      logoSpeedRef.current = mq.matches ? LOGO_SPEED_MOBILE : LOGO_SPEED_DESKTOP;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Preload every logo color so the instant swap on bounce never flashes blank.
  useEffect(() => {
    const preloaded = PALETTE.map((p) => {
      const img = new Image();
      img.src = p.logo;
      return img;
    });
    return () => {
      preloaded.length = 0;
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let x = 40;
    let y = 30;
    let vx = 1;
    let vy = 1;
    let idx = 0;
    let trackOffset = 0;
    let lastTime: number | null = null;

    const tick = (time: number) => {
      const dt = lastTime === null ? 0 : Math.min(time - lastTime, MAX_FRAME_DELTA_MS) / 1000;
      lastTime = time;

      const box = headerRef.current;
      const el = logoRef.current;
      const track = trackRef.current;

      if (box && el) {
        const maxX = box.clientWidth - el.offsetWidth;
        const maxY = box.clientHeight - el.offsetHeight;
        x += vx * logoSpeedRef.current * dt;
        y += vy * logoSpeedRef.current * dt;

        let hit = false;
        if (x <= 0) {
          x = 0;
          vx = 1;
          hit = true;
        } else if (x >= maxX) {
          x = maxX;
          vx = -1;
          hit = true;
        }
        if (y <= 0) {
          y = 0;
          vy = 1;
          hit = true;
        } else if (y >= maxY) {
          y = maxY;
          vy = -1;
          hit = true;
        }

        if (hit) {
          idx = (idx + 1 + Math.floor(Math.random() * (PALETTE.length - 1))) % PALETTE.length;
          setColorIndex(idx);
        }

        el.style.transform = `translate(${x}px, ${y}px)`;
      }

      if (track) {
        trackOffset -= MARQUEE_SPEED * dt;
        const unit = groupRef.current?.offsetWidth ?? 0;
        if (unit > 0 && -trackOffset >= unit) trackOffset += unit;
        track.style.transform = `translateX(${trackOffset}px)`;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const current = PALETTE[colorIndex];

  return (
    <>
      <section ref={headerRef} className={styles.header}>
        <div ref={logoRef} className={styles.logo}>
          <img src={current.logo} alt="monalisa" className={styles.logoImg} />
        </div>
      </section>

      <section className={styles.marquee} style={{ background: current.color }}>
        <div ref={trackRef} className={styles.track}>
          {Array.from({ length: MARQUEE_COPIES }, (_, i) => (
            <MarqueeGroup key={i} groupRef={i === 0 ? groupRef : undefined} />
          ))}
        </div>
      </section>
    </>
  );
}
