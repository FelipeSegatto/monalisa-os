import type { MouseEvent as ReactMouseEvent } from 'react';
import type { CatalogItem } from '../data/catalog';
import { CATALOG_ITEMS, soften } from '../data/catalog';
import { CollageTitle } from './CollageTitle';
import { IllustrationRing } from './IllustrationRing';
import { useBooking } from '../context/BookingContext';
import paperTexture from '../assets/images/booking-paper-grain.svg';
import styles from './DetailPage.module.css';

interface DetailPageProps {
  item: CatalogItem;
  onClose: () => void;
  /** True when this page was just revealed by the paper tear (longer entrance delay). */
  withTear?: boolean;
}

export function DetailPage({ item, onClose, withTear = true }: DetailPageProps) {
  const { openBook } = useBooking();

  const handleBookNow = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClose();
    openBook(CATALOG_ITEMS.indexOf(item));
  };

  return (
    <div className={styles.overlay} style={{ background: item.detailBg ?? soften(item.bg), color: item.ink }}>
      <div className={styles.texture} style={{ backgroundImage: `url("${paperTexture}")` }} />

      <div className={styles.container}>
        <button type="button" className={styles.back} onClick={onClose} aria-label="Voltar">
          ←
        </button>

        {item.illusWide ? (
          <div className={styles.photoColumnWide}>
            <img src={item.detailPhoto} alt={item.name} className={styles.photoWide} />
            <IllustrationRing illus={item.illus} illusAR={item.illusAR} className={styles.illusBelowPhoto} />
          </div>
        ) : (
          <div className={styles.photoColumn}>
            <img src={item.detailPhoto} alt={item.name} className={styles.photo} />
          </div>
        )}

        <div className={styles.textColumn}>
          <div className={styles.titleMeasure}>
            <div className={styles.titleRow}>
              <CollageTitle
                text={item.name}
                fontSize={`min(84px, calc(100cqi / ${(item.titleDiv ?? item.name.length * 0.78 + 0.6) * 0.82}))`}
                baseDelay={withTear ? 0.95 : 0.25}
                className={styles.collageWrap}
              />
              <a href="#agendar" className={`${styles.bookButton} ${styles.bookButtonTop}`} onClick={handleBookNow}>
                BOOK NOW
              </a>
            </div>
          </div>

          <div className={`${styles.block} ${styles.blockIntro}`}>
            <h2 className={styles.intro}>{item.intro}</h2>
            <p className={styles.body}>{item.body}</p>
          </div>

          <div className={styles.block}>
            <h3 className={styles.bulletsTitle}>O que esperar:</h3>
            <ul className={styles.bullets}>
              {item.bullets.map((bullet) => (
                <li key={bullet} className={styles.bullet}>
                  <span aria-hidden="true">·</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {!item.illusWide && (
          <IllustrationRing illus={item.illus} illusAR={item.illusAR} className={styles.illusSide} />
        )}

        <a href="#agendar" className={`${styles.bookButton} ${styles.bookButtonBottom}`} onClick={handleBookNow}>
          BOOK NOW
        </a>
      </div>
    </div>
  );
}
