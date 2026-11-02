import { WEEK, formatDateLabel, weekdayOf } from '../../data/booking';
import { useBooking } from '../../context/BookingContext';
import { CollageTitle } from '../CollageTitle';
import bkLogo from '../../assets/images/bk-logo.png';
import { PageShell } from './PageShell';

const PAID_TEXT: Record<string, string> = {
  pix: 'Pagamento via Pix recebido.',
  card: 'Pagamento no cartão aprovado.',
  local: 'O pagamento fica para o dia.',
};

export function ConfirmationPage() {
  const { bkS, name, day, time, paidWith, calYear, calMonth } = useBooking();
  const done = bkS === 4;

  const dd = day != null ? formatDateLabel(day, calMonth) : '';
  const doneText =
    (name.trim() ? `${name.trim().split(' ')[0]}, te` : 'Te') +
    ` esperamos ${day != null ? `${WEEK[weekdayOf(calYear, calMonth, day)].toLowerCase()}, ${dd}` : ''} às ${time || ''}.`;
  const paidText = (paidWith && PAID_TEXT[paidWith]) || '';

  return (
    <PageShell side="left" bg="#FF394A" color="#161515" style={{ paddingTop: '6cqw' }}>
      {done && (
        <div style={{ position: 'relative' }}>
          <CollageTitle text="Agendado!" fontSize="5.4cqw" baseDelay={0.85} as="div" />
        </div>
      )}
      <p style={{ position: 'relative', margin: '3.4cqw 0 0', fontSize: 'max(14px, 2.3cqw)', lineHeight: 1.35, textWrap: 'pretty' }}>{doneText}</p>
      <p style={{ position: 'relative', margin: '2cqw 0 0', fontSize: 'max(13px, 1.8cqw)', lineHeight: 1.35 }}>
        {paidText} Enviamos a confirmação no seu WhatsApp. Quando chegar, por favor tire os sapatos.
      </p>
      <img src={bkLogo} alt="" style={{ position: 'relative', marginTop: 'auto', width: '34cqw', display: 'block', alignSelf: 'center', transform: 'rotate(-4deg)' }} />
    </PageShell>
  );
}
