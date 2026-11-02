import type { CSSProperties, ReactNode, MouseEventHandler } from 'react';
import paperTexture from '../../assets/images/booking-paper-grain.svg';
import styles from './Book.module.css';

interface PageShellProps {
  side: 'left' | 'right';
  bg: string;
  color?: string;
  textureOpacity?: number;
  spine?: 'left' | 'right' | 'cover' | 'none';
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
}

export function PageShell({ side, bg, color, textureOpacity = 0.58, spine, children, onClick, style }: PageShellProps) {
  const spineClass =
    (spine ?? side) === 'right'
      ? styles.spineRight
      : (spine ?? side) === 'left'
        ? styles.spineLeft
        : spine === 'cover'
          ? styles.spineCover
          : null;

  return (
    <div
      className={side === 'right' ? styles.pageRight : styles.pageLeft}
      style={{ background: bg, color, ...style }}
      onClick={onClick}
    >
      {children}
      {spine !== 'none' && spineClass && <div aria-hidden="true" className={spineClass} />}
      <div
        aria-hidden="true"
        className={styles.pageTexture}
        style={{ backgroundImage: `url("${paperTexture}")`, opacity: textureOpacity }}
      />
    </div>
  );
}
