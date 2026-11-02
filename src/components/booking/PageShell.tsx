import type { CSSProperties, ReactNode, MouseEventHandler } from 'react';
// Keep grain rasterized: SVG filters and blend modes can flash during iOS 3D repaints.
import paperTexture from '../../assets/images/booking-paper-grain-flat.png';
import styles from './Book.module.css';

interface PageShellProps {
  side: 'left' | 'right';
  className?: string;
  bg: string;
  color?: string;
  spine?: 'left' | 'right' | 'cover' | 'none';
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLDivElement>;
  style?: CSSProperties;
}

export function PageShell({ side, bg, color, spine, children, onClick, style, className }: PageShellProps) {
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
      style={{ backgroundColor: bg, backgroundImage: `url("${paperTexture}")`, backgroundSize: '256px 256px', color, ...style }}
      onClick={onClick}
    >
      {children}
      {spine !== 'none' && spineClass && <div aria-hidden="true" className={spineClass} />}

    </div>
  );
}
