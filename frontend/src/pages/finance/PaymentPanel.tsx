import { useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { formatPrice } from "../../lib/format";
import type { PaymentMethod } from "../../lib/api";

interface Props {
  balance: number;
  expense?: boolean;
  close: () => void;
  save: (amount: number, method: PaymentMethod, installments: number | null,requestKey:string,paidAt:string) => void;
  saving: boolean;
}

export function PaymentPanel({ balance, expense = false, close, save, saving }: Props) {
  const [paidAt]=useState(()=>new Date().toISOString());
  const [requestKey]=useState(()=>crypto.randomUUID());
  const [amount, setAmount] = useState(balance);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [installments, setInstallments] = useState(1);

  return (
    <SidePanel
      eyebrow={expense ? "Despesa" : "Recebimento"}
      title="Registrar pagamento"
      close={close}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button primary-button-link"
            disabled={saving}
            onClick={() =>
              save(
                Math.min(balance, Math.max(0, amount)),
                method,
                method === "CARD" ? installments : null,
                requestKey,
                paidAt,
              )
            }
          >
            {saving ? "Confirmando…" : "Confirmar pagamento"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          <div className="payment-balance">
            <span className="section-meta">{expense ? "Valor a pagar" : "Saldo a receber"}</span>
            <strong className="display payment-balance-value">{formatPrice(balance)}</strong>
          </div>
          <label className="field">
            Valor
            <input
              className="text-input"
              type="number"
              min={0}
              max={balance}
              value={expense ? balance : amount}
              disabled={expense}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Forma
            <select
              className="select-input"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            >
              <option value="PIX">PIX</option>
              <option value="CASH">Dinheiro</option>
              <option value="CARD">Cartão</option>
            </select>
          </label>
          {method === "CARD" ? (
            <label className="field">
              Parcelas
              <select
                className="select-input"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 10, 12].map((value) => (
                  <option key={value} value={value}>
                    {value}x
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>
    </SidePanel>
  );
}
