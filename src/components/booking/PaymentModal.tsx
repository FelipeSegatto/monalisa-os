import type { ChangeEvent } from 'react';
import { CATALOG_ITEMS } from '../../data/catalog';
import { brl, formatDateLabel, summaryLines, WEEK, weekdayOf } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import type { PayMethod } from '../../hooks/useBookingFlow';
import paperTexture from '../../assets/images/textura-papel.png';
import styles from './PaymentModal.module.css';

const PAY_TABS: Array<{ k: PayMethod; label: string }> = [
  { k: 'pix', label: 'Pix' },
  { k: 'card', label: 'Cartão de crédito' },
  { k: 'local', label: 'Pagar no local' },
];

const CTA_LABEL: Record<PayMethod, (total: string) => string> = {
  pix: () => 'já fiz o Pix',
  card: (total) => `pagar ${total}`,
  local: () => 'confirmar e pagar no dia',
};

const PAY_NOTE: Record<PayMethod, string> = {
  card: 'Cobrança como MONALISA ESTETICA no seu extrato.',
  pix: 'A confirmação do Pix é automática.',
  local: 'Nada será cobrado agora.',
};

export function PaymentModal() {
  const {
    cart,
    extraIdx,
    day,
    time,
    total,
    payMethod,
    pixStart,
    pixCopied,
    cardNum,
    cardName,
    cardExp,
    cardCvv,
    cardInst,
    cardBrand,
    payBusy,
    payError,
    closePay,
    pickPayMethod,
    setCardNum,
    setCardName,
    setCardExp,
    setCardCvv,
    setCardInst,
    pixCopy,
    paySubmit,
    calYear,
    calMonth,
  } = useBooking();

  const lines = summaryLines(cart, extraIdx, CATALOG_ITEMS);
  const sumDay = day != null ? `${WEEK[weekdayOf(calYear, calMonth, day)]}, ${formatDateLabel(day, calMonth)}` : '—';
  const sumTime = time || '—';

  const left = Math.max(0, 600 - Math.floor((Date.now() - (pixStart || Date.now())) / 1000));
  const pixLeft = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const pixCode =
    '00020126580014BR.GOV.BCB.PIX0136monalisa-estetica-agendamento520400005303986540' + total + '.005802BR5916MONALISA ESTETICA6009SAO PAULO62070503***6304A1B2';

  const instOpts = [1, 2, 3].map((n) => ({ v: String(n), label: `${n}x de ${brl(Math.round(total / n))} sem juros` }));

  return (
    <div className={styles.overlay}>
      <div role="dialog" aria-label="Pagamento" className={styles.card}>
        <div className={styles.left}>
          <div className={styles.header}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span className={styles.title}>Pagamento</span>
              <span className={styles.subtitle}>ambiente seguro · dados criptografados</span>
            </div>
            <button type="button" aria-label="Fechar" className={styles.closeBtn} onClick={closePay}>
              ×
            </button>
          </div>

          <div className={styles.tabs}>
            {PAY_TABS.map((tab) => (
              <button
                key={tab.k}
                type="button"
                className={styles.tab}
                style={{ background: payMethod === tab.k ? '#161515' : '#FEFEFE', color: payMethod === tab.k ? '#FEFEFE' : '#161515' }}
                onClick={() => pickPayMethod(tab.k)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {payMethod === 'pix' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <div aria-label="QR Code Pix" className={styles.qr}>
                <span className={styles.qrLabel}>QR Code Pix</span>
              </div>
              <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, lineHeight: 1.4 }}>
                <span>
                  Abra o app do seu banco, escolha <b>Pix → Ler QR code</b> ou use o código abaixo.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input readOnly value={pixCode} className={styles.pixInput} />
                  <button type="button" className={styles.copyBtn} onClick={pixCopy}>
                    {pixCopied ? 'copiado!' : 'copiar'}
                  </button>
                </div>
                <span style={{ opacity: 0.75 }}>
                  o código expira em <b>{pixLeft}</b>
                </span>
              </div>
            </div>
          )}

          {payMethod === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label className={styles.field}>
                <span>número do cartão</span>
                <div style={{ position: 'relative' }}>
                  <input
                    inputMode="numeric"
                    value={cardNum}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCardNum(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    className={styles.input}
                    style={{ paddingRight: 96 }}
                  />
                  <span className={styles.brand}>{cardBrand}</span>
                </div>
              </label>
              <label className={styles.field}>
                <span>nome impresso no cartão</span>
                <input
                  value={cardName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCardName(e.target.value)}
                  placeholder="COMO ESTÁ NO CARTÃO"
                  className={styles.input}
                  style={{ textTransform: 'uppercase' }}
                />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.3fr', gap: 12 }}>
                <label className={styles.field}>
                  <span>validade</span>
                  <input
                    inputMode="numeric"
                    value={cardExp}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCardExp(e.target.value)}
                    placeholder="MM/AA"
                    className={styles.input}
                  />
                </label>
                <label className={styles.field}>
                  <span>CVV</span>
                  <input
                    inputMode="numeric"
                    value={cardCvv}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setCardCvv(e.target.value)}
                    placeholder="123"
                    className={styles.input}
                  />
                </label>
                <label className={styles.field}>
                  <span>parcelas</span>
                  <select value={cardInst} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCardInst(e.target.value)} className={styles.input}>
                    {instOpts.map((o) => (
                      <option key={o.v} value={o.v}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {payMethod === 'local' && (
            <div className={styles.localBox}>
              Você paga no dia, no balcão, com Pix, débito ou crédito. Pedimos que chegue 10 minutos antes. Cancelamentos com menos de 24h de
              antecedência podem ser cobrados.
            </div>
          )}

          {payError && <span className={styles.error}>{payError}</span>}

          <button type="button" disabled={payBusy} onClick={paySubmit} className={styles.cta}>
            {payBusy ? 'processando…' : CTA_LABEL[payMethod](brl(total))}
          </button>
        </div>

        <div className={styles.right}>
          <span style={{ fontWeight: 700, fontSize: 18 }}>seu pedido</span>
          {lines.map((ln) => (
            <div key={ln.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span>{ln.k}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{ln.v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, opacity: 0.75 }}>
            <span>{sumDay}</span>
            <span>{sumTime}</span>
          </div>
          <div className={styles.totalRow}>
            <span>total</span>
            <span>{brl(total)}</span>
          </div>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{PAY_NOTE[payMethod]}</span>
          <div aria-hidden="true" className={styles.texture} style={{ backgroundImage: `url(${paperTexture})` }} />
        </div>
      </div>
    </div>
  );
}
