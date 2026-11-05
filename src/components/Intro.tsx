import { useEffect, useRef } from 'react';
import bodybuilderColor from '../assets/images/bodybuilder-color.svg';
import mulherPoseRosa from '../assets/images/mulher-pose-rosa-mona.svg';
import logoAmarelo from '../assets/images/logo-amarelo.webp';
import logoNeon from '../assets/images/logo-neon.svg';
import paperTexture from '../assets/images/booking-paper-grain.svg';
import styles from './Intro.module.css';

const HERO_BG = '#8650D8';
// Pisca: 4 cores (sem vermelho, que é a cor do texto do homem), mesmo ritmo pros dois.
const BLINK = ['#F5B800', '#3A22E8', '#FEFEFE', '#FF3D7F'];
const BLINK_REPS = 3;
const BLINK_STEP = 140;
// Cada um pisca por metade do tempo normal, +50% em cima disso (mesmo ritmo).
const REVEAL_BLINK_STEPS = Math.round((BLINK_REPS * BLINK.length) / 2 * 1.5);

export function Intro({ onDone }: { onDone: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const mulherRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const finishRef = useRef(() => {});

  useEffect(() => {
    const ov = overlayRef.current!;
    const mulher = mulherRef.current!;
    const hero = heroRef.current!;
    const logo = logoRef.current!;
    const word = wordRef.current!;
    const paper = paperRef.current!;
    const flash = flashRef.current!;

    const timers: number[] = [];
    const later = (ms: number, fn: () => void) => { timers.push(window.setTimeout(fn, ms)); };

    // The word mark always sits at the exact same spot on screen for both the
    // woman and the man, so it's sized off the hero box only, independent of mulher's own box.
    const sizeHero = () => {
      const h = Math.min(window.innerHeight * 0.68, 600, window.innerWidth * 0.75);
      const w = h * 488 / 724;
      const left = window.innerWidth / 2 - w / 2;
      const top = window.innerHeight / 2 - h / 2;
      Object.assign(hero.style, { width: `${w}px`, height: `${h}px`, marginLeft: `${-w / 2}px`, marginTop: `${-h / 2}px` });
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      const mh = isMobile
        ? Math.min(window.innerHeight * 0.8, 700, window.innerWidth * 0.85)
        : Math.min(window.innerHeight * 0.66, 560, window.innerWidth * 0.7);
      const mw = mh * 320 / 672;
      Object.assign(mulher.style, { width: `${mw}px`, height: `${mh}px`, marginLeft: `${-mw / 2}px`, marginTop: `${-mh / 2}px` });
      const wordWidth = w * 1.62;
      const wordHeight = wordWidth * 55 / 301;
      Object.assign(word.style, {
        left: `${left + w / 2 - wordWidth / 2}px`,
        top: `${top + h * 0.37}px`,
        width: `${wordWidth}px`,
        height: `${wordHeight}px`,
      });
    };
    sizeHero();
    window.addEventListener('resize', sizeHero);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', sizeHero);
      document.body.style.overflow = previousOverflow;
      onDone();
    };
    finishRef.current = finish;

    const playEntrance = (target: HTMLElement, wordColor: string) => {
      target.style.opacity = '1';
      target.animate(
        [
          { transform: 'scale(2.6) rotate(-10deg)', opacity: 1 },
          { transform: 'scale(1.18) rotate(0deg)', opacity: 1, offset: 0.35 },
          { transform: 'scale(1.32)', opacity: 1, offset: 0.6 },
          { transform: 'scale(1.25)', opacity: 1 },
        ],
        { duration: 380, easing: 'cubic-bezier(.2,0,.2,1)', fill: 'forwards' },
      );
      ov.animate(
        [
          { transform: 'translate(0,0)' },
          { transform: 'translate(-14px,9px)', offset: 0.15 },
          { transform: 'translate(12px,-8px)', offset: 0.3 },
          { transform: 'translate(-8px,5px)', offset: 0.5 },
          { transform: 'translate(5px,-3px)', offset: 0.7 },
          { transform: 'translate(0,0)' },
        ],
        { duration: 360, delay: 120 },
      );
      flash.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 260, delay: 120, fill: 'forwards' });
      word.getAnimations().forEach((a) => a.cancel());
      word.style.display = 'block';
      word.style.backgroundColor = wordColor;
      word.animate(
        [{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }],
        { duration: 380, fill: 'forwards' },
      );
    };

    // Each reveal (woman, then man) gets: entrance, a pause, then the same blink
    // cadence (4 colors at 140ms, half the usual loop count) before handing off.
    const playBlink = (startAt: number, settleTo: string, steps = REVEAL_BLINK_STEPS) => {
      const cycle = Array.from({ length: BLINK_REPS }, () => BLINK).flat().slice(0, steps).concat(settleTo);
      cycle.forEach((c, i) => later(startAt + i * BLINK_STEP, () => { ov.style.background = c; }));
      return startAt + (cycle.length - 1) * BLINK_STEP;
    };

    later(150, () => {
      ov.style.background = HERO_BG;
      mulher.style.display = 'block';
      playEntrance(mulher, '#8650D8');
    });
    const tMulherBlinkEnd = playBlink(150 + 500, HERO_BG);

    const tHero = tMulherBlinkEnd + 250;
    later(tHero, () => {
      mulher.getAnimations().forEach((a) => a.cancel());
      mulher.style.opacity = '0';
      mulher.style.display = 'none';
      ov.style.background = HERO_BG;
      paper.style.opacity = '.58';
      playEntrance(hero, '#FF3B4E');
    });
    const tHeroBlinkEnd = playBlink(tHero + 500, HERO_BG);

    // One spinning yellow stamp hands off from the bodybuilder into the home logo's
    // own bounce, which starts yellow too, so the two read as the same beat.
    const tStamp = tHeroBlinkEnd + 250;
    later(tStamp, () => {
      hero.getAnimations().forEach((a) => a.cancel());
      hero.style.opacity = '0';
      hero.style.display = 'none';
      word.getAnimations().forEach((a) => a.cancel());
      word.style.opacity = '0';
      word.style.display = 'none';
      paper.style.opacity = '0';
      ov.style.background = HERO_BG;
      logo.style.display = 'block';
      logo.style.opacity = '1';
      logo.animate(
        [
          { scale: 2.1, rotate: '0deg', opacity: 1 },
          { scale: .78, rotate: '360deg', opacity: 1, offset: 0.55 },
          { scale: 1, rotate: '360deg', opacity: 1 },
        ],
        { duration: 280, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' },
      );
    });

    const tOut = tStamp + 600;
    later(tOut, () => {
      ov.animate(
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(1.08)' },
        ],
        { duration: 550, easing: 'cubic-bezier(.5,0,.7,1)', fill: 'forwards' },
      );
    });
    later(tOut + 570, finish);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', sizeHero);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={overlayRef} className={styles.intro}>
      <div ref={paperRef} className={styles.paper} style={{ backgroundImage: `url(${paperTexture})` }} />
      <div ref={mulherRef} className={styles.hero}>
        <img src={mulherPoseRosa} alt="" draggable={false} />
      </div>
      <div ref={heroRef} className={styles.hero}>
        <img src={bodybuilderColor} alt="" draggable={false} />
      </div>
      <img ref={logoRef} src={logoAmarelo} alt="monalisa" className={styles.logo} draggable={false} />
      <div
        ref={wordRef}
        className={styles.word}
        style={{
          WebkitMaskImage: `url(${logoNeon})`,
          maskImage: `url(${logoNeon})`,
        }}
      />
      <div ref={flashRef} className={styles.flash} />
      <button type="button" className={styles.skip} onClick={() => finishRef.current()}>pular</button>
    </div>
  );
}
