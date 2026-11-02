import type { ChangeEvent } from 'react';
import { useBooking } from '../../context/BookingContext';
import { PageShell } from './PageShell';
import styles from './Book.module.css';

const fieldLabelStyle = { display: 'flex', flexDirection: 'column', gap: '.4cqw', fontSize: 'max(12px, 1.5cqw)' } as const;
const fieldInputStyle = {
  fontFamily: "'Riccione Serial', Georgia, serif",
  fontSize: 'max(15px, 2cqw)',
  padding: '.6cqw 0',
  border: 0,
  borderBottom: '2px solid #161515',
  background: 'transparent',
  color: '#161515',
  outline: 'none',
} as const;

export function UserInfoPage() {
  const { name, phone, email, note, setName, setPhone, setEmail, setNote, bkGo } = useBooking();

  return (
    <PageShell side="left" bg="#F6B900" color="#161515">
      <div
        style={{
          position: 'relative',
          fontWeight: 700,
          fontSize: '4.6cqw',
          lineHeight: 1,
          color: '#FEFEFE',
          WebkitTextStroke: '.14em #161515',
          paintOrder: 'stroke fill',
        }}
      >
        Seus dados
      </div>

      <div style={{ position: 'relative', marginTop: '3.6cqw', display: 'flex', flexDirection: 'column', gap: '2.6cqw' }}>
        <label style={fieldLabelStyle}>
          <span>nome</span>
          <input
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="como podemos te chamar?"
            style={fieldInputStyle}
          />
        </label>
        <label style={fieldLabelStyle}>
          <span>WhatsApp</span>
          <input
            type="tel"
            value={phone}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
            placeholder="(11) 90000-0000"
            style={fieldInputStyle}
          />
        </label>
        <label style={fieldLabelStyle}>
          <span>e-mail</span>
          <input
            type="email"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            style={fieldInputStyle}
          />
        </label>
        <label style={fieldLabelStyle}>
          <span>alguma observação? (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
            placeholder="alergias, preferências…"
            style={fieldInputStyle}
          />
        </label>
      </div>

      <div className={styles.navRow} style={{ fontSize: 'max(11px, 1.4cqw)' }}>
        <button type="button" aria-label="Voltar" className={styles.navBtn} onClick={() => bkGo(-1)}>
          ←
        </button>
      </div>
    </PageShell>
  );
}
