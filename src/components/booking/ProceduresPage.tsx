import { useMobileBooking } from '../../hooks/useMobileBooking';
import { CardPager } from './CardPager';
import mobileStyles from './MobileCards.module.css';
import { useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { CATALOG_ITEMS } from '../../data/catalog';
import type { CatalogItem } from '../../data/catalog';
import type { CartLine } from '../../data/booking';
import { brl, lineBreakdown } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import bkSitting from '../../assets/images/bk-sitting2.png';
import { PageShell } from './PageShell';
import styles from './Book.module.css';

type Density = 'normal' | 'compact' | 'tight';

function densityFor(count: number): Density {
  if (count <= 3) return 'normal';
  if (count <= 5) return 'compact';
  return 'tight';
}

const LIST_SPACING: Record<Density, { marginTop: string; gap: string }> = {
  normal: { marginTop: '7.4cqw', gap: '1.4cqw' },
  compact: { marginTop: '3cqw', gap: '0.9cqw' },
  tight: { marginTop: '2cqw', gap: '0.6cqw' },
};

interface CardDensity {
  padding: string;
  rowGap: string;
  clusterGap: string;
  btnSize: string;
  btnFont: string;
  titleBudget: number;
  titleFloor: string;
  qtyFont: string;
  qtyMinWidth: string;
  priceFont: string;
  priceMinWidth: string;
  badgeFont: string;
  badgePadding: string;
  searchFont: string;
  searchPadding: string;
  row2Gap: string;
  row2PaddingTop: string;
}

const CARD_DENSITY: Record<Density, CardDensity> = {
  normal: {
    padding: '.9cqw 1.2cqw 1cqw',
    rowGap: '.8cqw',
    clusterGap: '.25cqw',
    btnSize: 'max(20px, 2.2cqw)',
    btnFont: 'max(12px, 1.4cqw)',
    titleBudget: 22,
    titleFloor: '12px',
    qtyFont: 'max(9px, 1.1cqw)',
    qtyMinWidth: '4.2cqw',
    priceFont: 'max(11px, 1.5cqw)',
    priceMinWidth: '7cqw',
    badgeFont: 'max(11px, 1.35cqw)',
    badgePadding: '.35cqw 1cqw',
    searchFont: 'max(11px, 1.3cqw)',
    searchPadding: '.3cqw .9cqw',
    row2Gap: '.6cqw',
    row2PaddingTop: '.8cqw',
  },
  compact: {
    padding: '.6cqw .9cqw .65cqw',
    rowGap: '.5cqw',
    clusterGap: '.2cqw',
    btnSize: 'max(17px, 1.8cqw)',
    btnFont: 'max(11px, 1.2cqw)',
    titleBudget: 22,
    titleFloor: '11px',
    qtyFont: 'max(8px, .95cqw)',
    qtyMinWidth: '3.8cqw',
    priceFont: 'max(10px, 1.3cqw)',
    priceMinWidth: '6.2cqw',
    badgeFont: 'max(10px, 1.15cqw)',
    badgePadding: '.25cqw .8cqw',
    searchFont: 'max(10px, 1.1cqw)',
    searchPadding: '.22cqw .7cqw',
    row2Gap: '.4cqw',
    row2PaddingTop: '.5cqw',
  },
  tight: {
    padding: '.4cqw .7cqw .45cqw',
    rowGap: '.35cqw',
    clusterGap: '.15cqw',
    btnSize: 'max(15px, 1.5cqw)',
    btnFont: 'max(10px, 1cqw)',
    titleBudget: 18,
    titleFloor: '10px',
    qtyFont: 'max(7px, .8cqw)',
    qtyMinWidth: '3.2cqw',
    priceFont: 'max(9px, 1.1cqw)',
    priceMinWidth: '5.4cqw',
    badgeFont: 'max(9px, 1cqw)',
    badgePadding: '.18cqw .65cqw',
    searchFont: 'max(9px, .95cqw)',
    searchPadding: '.16cqw .6cqw',
    row2Gap: '.3cqw',
    row2PaddingTop: '.4cqw',
  },
};

export function ProceduresPage() {
  const { cart, incQty, decQty, delLine, addArea, removeArea, bkGo } = useBooking();

  const isMobile = useMobileBooking();
  const [requestedPage, setRequestedPage] = useState(0);
  const currentPage = Math.min(requestedPage, Math.max(0, cart.length - 1));
  const rows = cart.map((line, j) => ({ line, j }));
  const visibleRows = isMobile ? rows.slice(currentPage, currentPage + 1) : rows;
  const subtotal = cart.reduce((a, c) => a + lineBreakdown(CATALOG_ITEMS[c.i], c).amount, 0);
  const density = isMobile ? 'normal' : densityFor(cart.length);
  const spacing = LIST_SPACING[density];

  return (
    <PageShell side="left" bg="#2F1CFF" color="#FEFEFE" className={isMobile ? mobileStyles.cartPage : undefined}>
      <div
        style={{
          position: 'relative',
          fontFamily: "'Riccione Serial', Georgia, serif",
          fontWeight: 700,
          fontSize: '5.4cqw',
          lineHeight: 1,
          color: '#161515',
          WebkitTextStroke: '.14em #F6B900',
          paintOrder: 'stroke fill',
        }}
      >
        {isMobile ? 'Carrinho' : 'Procedimentos'}
      </div>
      <span style={{ position: 'relative', marginTop: '2.6cqw', fontSize: 'max(12px, 1.6cqw)', opacity: 0.85 }}>
        {isMobile ? 'confira as áreas e a quantidade de sessões' : 'confira o que você escolheu — dá para mudar as sessões ou remover'}
      </span>

      <div
        className={isMobile ? mobileStyles.cartList : undefined}
        style={{
          position: 'relative',
          marginTop: spacing.marginTop,
          width: 'calc(100% - 3cqw)',
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.gap,
        }}
      >
        {visibleRows.map(({ line, j }) => (
          <CartCard
            key={line.i}
            j={j}
            line={line}
            item={CATALOG_ITEMS[line.i]}
            isFirst={isMobile || j === 0}
            mobile={isMobile}
            density={density}
            incQty={incQty}
            decQty={decQty}
            delLine={delLine}
            addArea={addArea}
            removeArea={removeArea}
          />
        ))}

        {cart.length === 0 && (
          <div style={{ fontSize: 'max(13px, 1.9cqw)', lineHeight: 1.3, border: '2px dashed #FEFEFE', padding: '2cqw' }}>
            {isMobile ? 'Seu carrinho está vazio. Volte para escolher um procedimento.' : 'nenhum procedimento ainda. escolha ao lado →'}
          </div>
        )}
      </div>

      {isMobile && <CardPager label="Carrinho" page={currentPage} pageSize={1} total={cart.length} onChange={setRequestedPage} />}
      {isMobile && <p className={mobileStyles.subtotal}>subtotal <strong>{brl(subtotal)}</strong></p>}

      <div className={styles.navRow}>
        <button type="button" aria-label="Fechar agenda" className={styles.navBtn} onClick={() => bkGo(-1)}>
          ←
        </button>
        <span style={{ fontSize: 'max(13px, 1.9cqw)' }}>
          subtotal <b>{brl(subtotal)}</b>
        </span>
      </div>
    </PageShell>
  );
}

interface CartCardProps {
  j: number;
  line: CartLine;
  item: CatalogItem;
  isFirst: boolean;
  mobile?: boolean;
  density: Density;
  incQty: (j: number) => void;
  decQty: (j: number) => void;
  delLine: (j: number) => void;
  addArea: (j: number, area: string) => void;
  removeArea: (j: number, area: string) => void;
}

function CartCard({ j, line, item, isFirst, mobile, density, incQty, decQty, delLine, addArea, removeArea }: CartCardProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const d = CARD_DENSITY[density];
  const smallBtnStyle: CSSProperties = {
    width: d.btnSize,
    height: d.btnSize,
    border: '1.5px solid #161515',
    borderRadius: 4,
    background: '#FEFEFE',
    color: '#161515',
    fontFamily: "'Riccione Serial', Georgia, serif",
    fontSize: d.btnFont,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
    flex: 'none',
  };

  const { amount, hasQuote } = lineBreakdown(item, line);
  const totalLabel = hasQuote ? (amount > 0 ? `${brl(amount)} + orçamento` : 'sob avaliação') : brl(amount);

  const available = item.areas.filter((ar) => !line.a.includes(ar.name));
  const filtered = available.filter((ar) => ar.name.toLowerCase().includes(query.toLowerCase()));

  const pick = (areaName: string) => {
    addArea(j, areaName);
    setQuery('');
  };

  return (
    <div
      className={mobile ? mobileStyles.cartCard : undefined}
      data-cart-procedure={item.name}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: d.rowGap,
        background: '#FEFEFE',
        color: '#161515',
        border: '2px solid #161515',
        padding: d.padding,
        transform: `rotate(${j % 2 ? 0.5 : -0.5}deg)`,
      }}
    >
      <div className={mobile ? mobileStyles.cartCardHeader : undefined} style={{ display: 'flex', alignItems: 'center', gap: '.5cqw' }}>
        {isFirst && (
          <img
            src={bkSitting}
            alt=""
            style={{
              position: 'absolute',
              right: 'calc(-4.4cqw - 8px)',
              bottom: 'calc(100% - 3.9cqw + 4px)',
              width: '8.6cqw',
              display: 'block',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 700,
            fontSize: `max(${d.titleFloor}, min(1.9cqw, ${(d.titleBudget / item.name.length).toFixed(2)}cqw))`,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {item.name}
        </span>
        <div className={mobile ? mobileStyles.quantity : undefined} style={{ display: 'flex', alignItems: 'center', gap: d.clusterGap, flex: 'none' }}>
          <button type="button" aria-label="menos" onClick={() => decQty(j)} style={smallBtnStyle}>
            −
          </button>
          <span style={{ fontSize: d.qtyFont, minWidth: d.qtyMinWidth, textAlign: 'center', lineHeight: 1.1 }}>
            {line.n} {line.n > 1 ? 'sessões' : 'sessão'}
          </span>
          <button type="button" aria-label="mais" onClick={() => incQty(j)} style={smallBtnStyle}>
            +
          </button>
          <span style={{ fontWeight: 700, fontSize: d.priceFont, minWidth: d.priceMinWidth, textAlign: 'right' }}>{totalLabel}</span>
        </div>
        <button
          type="button"
          aria-label="remover"
          onClick={() => delLine(j)}
          style={{ ...smallBtnStyle, borderColor: 'transparent', background: 'transparent', flex: 'none' }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: d.row2Gap,
          borderTop: '1.5px dashed #161515',
          paddingTop: d.row2PaddingTop,
        }}
      >
        <div className={mobile ? mobileStyles.selectedAreas : undefined} tabIndex={mobile ? 0 : undefined} role={mobile ? 'group' : undefined} aria-label={mobile ? 'Áreas selecionadas; deslize para ver todas' : undefined} style={mobile ? undefined : { display: 'contents' }}>
        {line.a.map((ar) => (
          <button
            key={ar}
            type="button"
            aria-label="remover área"
            onClick={() => removeArea(j, ar)}
            style={{
              fontSize: d.badgeFont,
              padding: d.badgePadding,
              border: '1.5px solid #161515',
              borderRadius: 999,
              cursor: 'pointer',
              background: '#161515',
              color: '#FEFEFE',
              fontFamily: "'Riccione Serial', Georgia, serif",
            }}
          >
            {ar} ×
          </button>
        ))}
        </div>

        {available.length > 0 && (
          <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
            <input
              type="text"
              value={query}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              placeholder={line.a.length ? 'adicionar área…' : 'escolha uma área…'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: "'Riccione Serial', Georgia, serif",
                fontSize: d.searchFont,
                padding: d.searchPadding,
                border: '1.5px dashed #161515',
                borderRadius: 999,
                background: 'transparent',
                color: '#161515',
                outline: 'none',
              }}
            />
            {open && filtered.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  zIndex: 10,
                  top: 'calc(100% + 4px)',
                  left: 0,
                  minWidth: '100%',
                  maxHeight: '12cqw',
                  overflowY: 'auto',
                  background: '#FEFEFE',
                  border: '1.5px solid #161515',
                  borderRadius: 8,
                  boxShadow: '2px 2px 0 #161515',
                }}
              >
                {filtered.map((ar) => (
                  <button
                    key={ar.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(ar.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1cqw',
                      width: '100%',
                      boxSizing: 'border-box',
                      fontFamily: "'Riccione Serial', Georgia, serif",
                      fontSize: d.searchFont,
                      padding: '.4cqw .9cqw',
                      border: 0,
                      background: 'transparent',
                      color: '#161515',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{ar.name}</span>
                    <span style={{ opacity: 0.7, whiteSpace: 'nowrap' }}>{ar.price == null ? 'sob avaliação' : brl(ar.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
