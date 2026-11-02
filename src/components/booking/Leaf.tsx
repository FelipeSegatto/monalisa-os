import type { ReactNode } from 'react';
import styles from './Book.module.css';

interface LeafProps {
  transform: string;
  zIndex: number;
  frontPointerEvents: 'auto' | 'none';
  backPointerEvents: 'auto' | 'none';
  front: ReactNode;
  back: ReactNode;
}

export function Leaf({ transform, zIndex, frontPointerEvents, backPointerEvents, front, back }: LeafProps) {
  return (
    <div className={styles.leaf} style={{ transform, zIndex }}>
      <div className={styles.face} style={{ pointerEvents: frontPointerEvents }}>
        {front}
      </div>
      <div className={`${styles.face} ${styles.faceBack}`} style={{ pointerEvents: backPointerEvents }}>
        {back}
      </div>
    </div>
  );
}
