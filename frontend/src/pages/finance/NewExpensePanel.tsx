import { useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import type { CreateExpenseInput, ExpenseCategory, PaymentMethod } from "../../lib/api";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "INSUMOS", label: "Insumos" },
  { value: "EQUIPAMENTOS_MANUTENCAO", label: "Equipamentos e manutenção" },
  { value: "MARKETING", label: "Marketing" },
  { value: "ALUGUEL_ESTRUTURA", label: "Aluguel e estrutura" },
  { value: "SERVICOS", label: "Serviços" },
  { value: "PESSOAL", label: "Pessoal" },
  { value: "OUTROS", label: "Outros" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  close: () => void;
  save: (input: CreateExpenseInput) => void;
  saving: boolean;
}

export function NewExpensePanel({ close, save, saving }: Props) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("INSUMOS");
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState(todayISO());
  const [status, setStatus] = useState<"PENDENTE" | "PAGO">("PENDENTE");
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [recurrence, setRecurrence] = useState<"ONCE" | "RECURRING">("ONCE");

  return (
    <SidePanel
      eyebrow="Financeiro"
      title="Nova despesa"
      close={close}
      wide
      footer={
        <>
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button primary-button-link"
            disabled={!description.trim() || amount <= 0 || saving}
            onClick={() =>
              save({
                description: description.trim(),
                category,
                supplier: supplier.trim() || null,
                amount,
                dueDate,
                paid: status === "PAGO",
                paidAt: status === "PAGO" ? todayISO() : null,
                method: status === "PAGO" ? method : null,
                recurrence,
              })
            }
          >
            {saving ? "Salvando…" : "Salvar despesa"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          <label className="field">
            Descrição
            <input
              className="text-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="field">
            Categoria
            <select
              className="select-input"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Fornecedor · opcional
            <input className="text-input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          </label>
          <div className="field-grid">
            <label className="field">
              Valor
              <input
                className="text-input"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              />
            </label>
            <label className="field">
              Vencimento
              <input
                className="text-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              Status
              <select
                className="select-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as "PENDENTE" | "PAGO")}
              >
                <option value="PENDENTE">Pendente</option>
                <option value="PAGO">Pago</option>
              </select>
            </label>
            <label className="field">
              Recorrência
              <select
                className="select-input"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as "ONCE" | "RECURRING")}
              >
                <option value="ONCE">Única</option>
                <option value="RECURRING">Recorrente</option>
              </select>
            </label>
          </div>
          {status === "PAGO" ? (
            <label className="field">
              Forma de pagamento
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
          ) : null}
        </div>
      </div>
    </SidePanel>
  );
}
