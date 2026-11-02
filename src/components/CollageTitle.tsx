import type { CSSProperties, ElementType } from 'react';
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
  /** CSS font-size value, e.g. "min(84px, calc(100cqi / 10))" or "5.4cqw". */
  fontSize: string;
  /** Seconds before the first letter starts falling in. */
  baseDelay: number;
  as?: ElementType;
  className?: string;
}

export function CollageTitle({ text, fontSize, baseDelay, as: As = 'h1', className }: CollageTitleProps) {
  let letterIndex = 0;
  let charIndex = 0;
  const words = text.split(' ');

  return (
    <As className={[styles.title, className].filter(Boolean).join(' ')} style={{ fontSize }} aria-label={text}>
      {words.map((word, wordIdx) => {
        const letters = word.split('').map((ch) => {
          const i = letterIndex++;
          const myCharIndex = charIndex++;
          const [fill, stroke] = COLLAGE[i % COLLAGE.length];
          const r = (((myCharIndex * 37) % 9) - 4) * 1.1;
          const y = (((myCharIndex * 53) % 7) - 3) * 0.018;
          const delay = baseDelay + myCharIndex * 0.07;

          const style: LetterStyle = {
            color: fill,
            WebkitTextStroke: `.2em ${stroke}`,
            animationDelay: `${delay}s`,
            '--y': `${y}em`,
            '--r': `${r}deg`,
          };

          return (
            <span key={myCharIndex} className={styles.letter} style={style} aria-hidden="true">
              {ch}
            </span>
          );
        });

        const isLast = wordIdx === words.length - 1;
        if (!isLast) charIndex += 1;

        return (
          <span key={wordIdx} className={styles.word}>
            {letters}
            {!isLast && (
              <span className={styles.space} aria-hidden="true">
                {' '}
              </span>
            )}
          </span>
        );
      })}
    </As>
  );
}
