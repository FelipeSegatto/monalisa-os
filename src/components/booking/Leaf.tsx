import type { ReactNode } from 'react';
import styles from './Book.module.css';

interface LeafProps {
  transform: string;
  zIndex: number;
  frontPointerEvents: 'auto' | 'none';
  backPointerEvents: 'auto' | 'none';
  cover?: boolean;
  front: ReactNode;
  back: ReactNode;
}

export function Leaf({ transform, zIndex, frontPointerEvents, backPointerEvents, front, back, cover }: LeafProps) {
  return (
    <div className={styles.leaf} style={{ transform, zIndex }}>
      <div className={`${styles.face} ${cover ? styles.coverFace : ''}`} inert={frontPointerEvents === 'none'} style={{ pointerEvents: frontPointerEvents }}>
        {front}
      </div>
      <div className={`${styles.face} ${styles.faceBack}`} inert={backPointerEvents === 'none'} style={{ pointerEvents: backPointerEvents }}>
        {back}
      </div>
    </div>
  );
}
