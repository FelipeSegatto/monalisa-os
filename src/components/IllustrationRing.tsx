import styles from './IllustrationRing.module.css';

const RING_COLORS: Array<{ color: string; delay: string }> = [
  { color: '#8650D8', delay: '0s' },
  { color: '#FF3B4E', delay: '-0.6s' },
  { color: '#FF3D7F', delay: '-1.2s' },
  { color: '#F5B800', delay: '-1.8s' },
];

interface IllustrationRingProps {
  illus: string;
  illusAR: string;
  className?: string;
}

export function IllustrationRing({ illus, illusAR, className }: IllustrationRingProps) {
  const mask = `url(${illus}) center / 100% 100% no-repeat`;

  return (
    <div className={`${styles.ring} ${className ?? ''}`} style={{ aspectRatio: illusAR }}>
      {RING_COLORS.map(({ color, delay }) => (
        <div
          key={color}
          className={styles.silhouette}
          style={{
            background: color,
            mask,
            WebkitMask: mask,
            animationDelay: delay,
          }}
        />
      ))}
      <img src={illus} alt="" className={styles.illusImg} draggable={false} />
    </div>
  );
}
