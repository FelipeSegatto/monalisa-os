import type { CSSProperties } from 'react';
import styles from './CollageTitle.module.css';

const COLLAGE: Array<[string, string]> = [
  ['#000000', '#9C276B'],
  ['#000000', '#F6B900'],
  ['#000000', '#FF394A'],
  ['#000000', '#764BCF'],
  ['#FF5179', '#3420EF'],
  ['#000000', '#FF05FF'],
  ['#000000', '#EC5A85'],
  ['#FFFFFF', '#000000'],
  ['#000000', '#00C0F2'],
  ['#000000', '#F141A4'],
  ['#000000', '#FE7C27'],
];

interface LetterStyle extends CSSProperties {
  '--y': string;
  '--r': string;
}

interface CollageTitleProps {
  text: string;
  /** Column-width divisor for font-size: min(84px, 100cqi / titleDiv). */
  titleDiv?: number;
  /** Seconds before the first letter starts falling in. */
  baseDelay: number;
}

export function CollageTitle({ text, titleDiv, baseDelay }: CollageTitleProps) {
  const div = titleDiv ?? text.length * 0.78 + 0.6;
  let letterIndex = 0;

  return (
    <h1 className={styles.title} style={{ fontSize: `min(84px, calc(100cqi / ${div}))` }}>
      {text.split('').map((ch, charIndex) => {
        if (ch === ' ') {
          return (
            <span key={charIndex} className={styles.space}>
              {' '}
            </span>
          );
        }

        const i = letterIndex++;
        const [fill, stroke] = COLLAGE[i % COLLAGE.length];
        const r = (((charIndex * 37) % 9) - 4) * 1.1;
        const y = (((charIndex * 53) % 7) - 3) * 0.018;
        const delay = baseDelay + charIndex * 0.07;

        const style: LetterStyle = {
          color: fill,
          WebkitTextStroke: `.2em ${stroke}`,
          animationDelay: `${delay}s`,
          '--y': `${y}em`,
          '--r': `${r}deg`,
        };

        return (
          <span key={charIndex} className={styles.letter} style={style}>
            {ch}
          </span>
        );
      })}
    </h1>
  );
}
