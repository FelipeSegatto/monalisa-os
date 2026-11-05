import {Link} from "react-router-dom";
import { SidePanel } from "../../components/SidePanel";
import { formatPrice, formatLongDate } from "../../lib/format";
import type { SaleDetail } from "../../lib/api";

const STATUS_LABELS: Record<SaleDetail["status"], string> = {
  CANCELLED: "Cancelada",
  PENDING: "Pendente",
  PARTIAL: "Parcialmente paga",
  PAID: "Paga",
};

const METHOD_LABELS: Record<string, string> = { PIX: "PIX", CASH: "Dinheiro", CARD: "Cartão" };

interface Props {
  sale: SaleDetail;
  close: () => void;
  onRegisterPayment: () => void;
  onCancel: () => void;
  cancelling: boolean;
}

export function SaleDetailPanel({ sale, close, onRegisterPayment, onCancel, cancelling }: Props) {
  return (
    <SidePanel
      eyebrow="Detalhe da venda"
      title={`Venda #${sale.id}`}
      close={close}
      wide
      footer={
        <>
          {!sale.cancelled ? (
            <button type="button" className="secondary-button" disabled={cancelling} onClick={onCancel}>
              {cancelling ? "Cancelando…" : "Cancelar venda"}
            </button>
          ) : null}
          {sale.balance > 0 && !sale.cancelled ? (
            <button type="button" className="primary-button primary-button-link" onClick={onRegisterPayment}>
              Registrar pagamento
            </button>
          ) : null}
        </>
      }
    >
      <Link className="section-link" to={`/comercial/vendas/${sale.id}`}>Ver condições, descontos e sessões no comercial →</Link>
      <div className="detail-lead">
        <h3 className="note-title">{sale.customerName}</h3>
        <span className="section-meta">{formatLongDate(sale.createdAt)}</span>
      </div>

      <div className="panel-section">
        <div className="section-header">
          <span className="section-label">Itens</span>
        </div>
        {sale.items.map((item) => (
          <div className="detail-line" key={item.id}>
            <span>
              {item.description}
              {item.sessions > 1 ? ` · ${item.sessions} sessões` : ""}
            </span>
            <b>{formatPrice(item.finalPrice)}</b>
          </div>
        ))}
        <div className="sale-totals compact">
          <div>
            <span>Subtotal</span>
            <b>{formatPrice(sale.subtotal)}</b>
          </div>
          {sale.discount > 0 ? (
            <div>
              <span>Desconto</span>
              <b>− {formatPrice(sale.discount)}</b>
            </div>
          ) : null}
          <div className="total">
            <span>Total</span>
            <b className="display">{formatPrice(sale.total)}</b>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-header">
          <span className="section-label">Pagamentos</span>
        </div>
        {sale.payments.length > 0 ? (
          sale.payments.map((payment) => (
            <div className="detail-line" key={payment.id}>
              <span>
                {formatLongDate(payment.paidAt)} · {METHOD_LABELS[payment.method]}
                {payment.installments ? ` · ${payment.installments}x` : ""}
                {payment.reversal?` · Estornado: ${payment.reversal.reason}`:""}
              </span>
              <b>{formatPrice(payment.amount)}</b>
            </div>
          ))
        ) : (
          <p className="procedure-empty">Nenhum pagamento registrado.</p>
        )}
        <div className="payment-preview">
          <div>
            <span>Recebido</span>
            <b>{formatPrice(sale.received)}</b>
          </div>
          <div>
            <span>A receber</span>
            <b>{formatPrice(sale.balance)}</b>
          </div>
          <span className={sale.status === "PAID" ? "active-badge is-active" : "active-badge"}>
            {STATUS_LABELS[sale.status]}
          </span>
        </div>
      </div>

      {sale.professionalName ? (
        <div className="panel-section">
          <div className="section-header">
            <span className="section-label">Profissional e comissão</span>
          </div>
          <div className="detail-line">
            <span>{sale.professionalName}</span>
            <b>
              {sale.commissionPercent
                ? `${sale.commissionPercent}% · ${formatPrice((sale.total * sale.commissionPercent) / 100)}`
                : "Sem comissão"}
            </b>
          </div>
        </div>
      ) : null}
    </SidePanel>
  );
}
