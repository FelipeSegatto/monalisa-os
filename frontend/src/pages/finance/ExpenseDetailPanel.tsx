import { SidePanel } from "../../components/SidePanel";
import { formatPrice, formatLongDate } from "../../lib/format";
import type { ExpenseSummary } from "../../lib/api";

const METHOD_LABELS: Record<string, string> = { PIX: "PIX", CASH: "Dinheiro", CARD: "Cartão" };

interface Props {
  expense: ExpenseSummary;
  close: () => void;
  onRegisterPayment: () => void;
}

export function ExpenseDetailPanel({ expense, close, onRegisterPayment }: Props) {
  const status = expense.cancelled ? "Cancelado" : expense.paid ? "Pago" : "Pendente";

  return (
    <SidePanel
      eyebrow={`Despesa #${expense.id}`}
      title={expense.description}
      close={close}
      footer={
        !expense.paid && !expense.cancelled ? (
          <button type="button" className="primary-button primary-button-link" onClick={onRegisterPayment}>
            Registrar pagamento
          </button>
        ) : undefined
      }
    >
      <div className="expense-detail">
        <div>
          <span className="section-meta">Categoria</span>
          <b>{expense.categoryLabel}</b>
        </div>
        <div>
          <span className="section-meta">Fornecedor</span>
          <b>{expense.supplier ?? "—"}</b>
        </div>
        <div>
          <span className="section-meta">Valor</span>
          <b className="display expense-detail-amount">{formatPrice(expense.amount)}</b>
        </div>
        <div>
          <span className="section-meta">Vencimento</span>
          <b>{formatLongDate(expense.dueDate)}</b>
        </div>
        <div>
          <span className="section-meta">Status</span>
          <span className={expense.paid ? "active-badge is-active" : "active-badge"}>{status}</span>
        </div>
        {expense.paid ? (
          <>
            <div>
              <span className="section-meta">Pagamento</span>
              <b>{expense.paidAt ? formatLongDate(expense.paidAt) : "—"}</b>
            </div>
            <div>
              <span className="section-meta">Forma</span>
              <b>{expense.method ? METHOD_LABELS[expense.method] : "—"}</b>
            </div>
          </>
        ) : null}
      </div>
    </SidePanel>
  );
}
