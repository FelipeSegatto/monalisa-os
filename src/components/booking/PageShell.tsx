import type { CSSProperties, ReactNode, MouseEventHandler } from 'react';
import paperTexture from '../../assets/images/booking-paper-grain.svg';
import styles from './Book.module.css';

interface PageShellProps {
  side: 'left' | 'right';
  className?: string;
  bg: string;
  color?: string;
  textureOpacity?: number;
  spine?: 'left' | 'right' | 'cover' | 'none';
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
}

export function PageShell({ side, bg, color, textureOpacity = 0.58, spine, children, onClick, style, className }: PageShellProps) {
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
      className={`${side === 'right' ? styles.pageRight : styles.pageLeft} ${className ?? ''}`}
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
