import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatLongDate, formatPrice } from "../../lib/format";
import { FinanceNav } from "./FinanceNav";
import { ExpenseEditor } from "./ExpenseEditor";
import { ExpensePaymentPanel } from "./ExpensePaymentPanel";
import { ExpensePerformanceSection } from "./ExpensePerformanceSection";
import {
  cancelExpense,
  createExpense,
  getExpenseDetail,
  listExpenses,
  payExpense,
  reverseExpensePayment,
  reviseExpense,
  type CreateExpenseInput,
  type ExpenseDetail,
} from "./api";
import "./expenses.css";

const CATEGORY_LABELS: Record<string, string> = {
  INSUMOS: "Insumos",
  EQUIPAMENTOS_MANUTENCAO: "Equipamentos e manutenção",
  MARKETING: "Marketing",
  ALUGUEL_ESTRUTURA: "Aluguel e estrutura",
  SERVICOS: "Serviços",
  PESSOAL: "Pessoal",
  OUTROS: "Outros",
};

function DetailView({ id }: { id: number }) {
  const navigate = useNavigate();
  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<"revise" | "pay" | null>(null);
  const [busy, setBusy] = useState(false);

  function reload() {
    setError("");
    getExpenseDetail(id)
      .then(setExpense)
      .catch((e) => setError(e.message));
  }
  useEffect(reload, [id]);

  async function handleRevise(input: CreateExpenseInput) {
    setBusy(true);
    try {
      const updated = await reviseExpense(id, input);
      setExpense(updated);
      setPanel(null);
    } finally {
      setBusy(false);
    }
  }

  async function handlePay(input: { amount: number; method: any; paidAt: string; requestKey: string }) {
    setBusy(true);
    try {
      const updated = await payExpense(id, input);
      setExpense(updated);
      setPanel(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleReverse(paymentId: number) {
    const reason = window.prompt("Motivo do estorno");
    if (!reason) return;
    setBusy(true);
    try {
      const updated = await reverseExpensePayment(id, paymentId, {
        reason,
        requestKey: crypto.randomUUID(),
      });
      setExpense(updated);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    const reason = window.prompt("Motivo do cancelamento");
    if (!reason) return;
    setBusy(true);
    try {
      const updated = await cancelExpense(id, reason);
      setExpense(updated);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="page-status">Não foi possível carregar a despesa.</p>;
  if (!expense) return <p className="page-status">Carregando…</p>;

  const activePayment = expense.payments.find((p) => p.type === "PAYMENT" && !p.reversed);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <button type="button" className="text-button" onClick={() => navigate("/financeiro/despesas")}>
            ← Despesas
          </button>
          <h1 className="page-header-title">{expense.description}</h1>
          {expense.historicalPending ? (
            <span className="expense-pending-badge">Pendência histórica — classificação incompleta</span>
          ) : null}
        </div>
        <div className="page-actions">
          {!expense.cancelled && !activePayment ? (
            <button type="button" className="secondary-button" onClick={() => setPanel("revise")}>
              Revisar
            </button>
          ) : null}
          {!expense.cancelled && !activePayment ? (
            <button type="button" className="secondary-button" onClick={() => setPanel("pay")}>
              Registrar pagamento
            </button>
          ) : null}
          {!expense.cancelled && !activePayment ? (
            <button type="button" className="secondary-button" onClick={handleCancel}>
              Cancelar despesa
            </button>
          ) : null}
        </div>
      </header>

      <div className="financial-summary">
        <div className="financial-summary-item">
          <span className="section-meta">Categoria</span>
          <b>{CATEGORY_LABELS[expense.category] ?? expense.category}</b>
        </div>
        <div className="financial-summary-item">
          <span className="section-meta">Valor</span>
          <b>{formatPrice(expense.amount)}</b>
        </div>
        <div className="financial-summary-item">
          <span className="section-meta">Vencimento</span>
          <b>{expense.dueDate ? formatLongDate(expense.dueDate) : "—"}</b>
        </div>
        <div className="financial-summary-item">
          <span className="section-meta">Competência</span>
          <b>{expense.competenceMonth ?? "—"}</b>
        </div>
        <div className="financial-summary-item">
          <span className="section-meta">Status</span>
          <b>{expense.cancelled ? "Cancelada" : expense.paid ? "Paga" : "Pendente"}</b>
        </div>
        <div className="financial-summary-item">
          <span className="section-meta">Destinação</span>
          <b>
            {expense.destination === "GENERAL"
              ? "Geral"
              : expense.destination === "PROCEDURES"
                ? "Procedimentos"
                : expense.destination === "MIXED"
                  ? "Misto"
                  : "—"}
          </b>
        </div>
      </div>

      {expense.allocations.length ? (
        <div>
          <div className="section-header">
            <span className="section-label">Distribuição</span>
          </div>
          {expense.allocationNote ? <p className="section-meta">{expense.allocationNote}</p> : null}
          {expense.allocations.map((a) => (
            <div className="expense-history-row" key={a.id}>
              <span>{a.procedureName ?? "Geral"}</span>
              <b>{formatPrice(a.amount)}</b>
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <div className="section-header">
          <span className="section-label">Pagamentos</span>
        </div>
        {expense.payments.length === 0 ? (
          <p className="procedure-empty">Nenhum pagamento registrado.</p>
        ) : (
          expense.payments.map((p) => (
            <div className="expense-history-row" key={p.id}>
              <span>
                {p.type === "REVERSAL" ? "Estorno" : "Pagamento"} · {p.source === "LEGACY" ? "legado" : p.method ?? "—"}
                {p.occurredAt ? ` · ${formatLongDate(p.occurredAt)}` : ""}
              </span>
              <span>
                <b>{formatPrice(p.amount)}</b>
                {p.type === "PAYMENT" && !p.reversed && !expense.cancelled ? (
                  <button type="button" className="text-button" onClick={() => handleReverse(p.id)} style={{ marginLeft: 12 }}>
                    Estornar
                  </button>
                ) : null}
              </span>
            </div>
          ))
        )}
      </div>

      <div>
        <div className="section-header">
          <span className="section-label">Histórico de revisões</span>
        </div>
        {expense.revisions.map((r) => (
          <div className="expense-history-row" key={r.id}>
            <span>
              v{r.version} · {formatPrice(r.amount)} · {r.reason}
            </span>
            <span className="section-meta">{formatLongDate(r.createdAt)}</span>
          </div>
        ))}
      </div>

      {panel === "revise" ? (
        <ExpenseEditor
          title="Revisar despesa"
          close={() => setPanel(null)}
          busy={busy}
          onSubmit={handleRevise}
          initial={{
            description: expense.description,
            category: expense.category,
            supplier: expense.supplier,
            amount: expense.amount,
            dueDate: expense.dueDate ?? undefined,
            competenceMonth: expense.competenceMonth ?? undefined,
            recurrence: expense.recurrence,
            destination: expense.destination ?? "GENERAL",
            basis: expense.basis ?? "VALUE",
            allocations: expense.allocations.map((a) => ({
              procedureId: a.procedureId,
              value: a.inputValue,
            })),
            allocationNote: expense.allocationNote ?? undefined,
          }}
        />
      ) : null}
      {panel === "pay" ? (
        <ExpensePaymentPanel
          amount={expense.amount}
          close={() => setPanel(null)}
          saving={busy}
          save={handlePay}
        />
      ) : null}
    </div>
  );
}

function ListView() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseDetail[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  function reload() {
    setLoading(true);
    setError("");
    listExpenses({ search: search || undefined })
      .then((r) => setExpenses(r.expenses))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(reload, [search]);

  async function handleCreate(input: CreateExpenseInput) {
    setBusy(true);
    try {
      const expense = await createExpense(input);
      setCreating(false);
      navigate(`/financeiro/despesas/${expense.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Financeiro</p>
          <h1 className="page-header-title">Despesas</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="primary-button primary-button-link" onClick={() => setCreating(true)}>
            Nova despesa
          </button>
        </div>
      </header>

      <ExpensePerformanceSection />

      <div className="section-header">
        <span className="section-label">Lançamentos</span>
        <input
          className="text-input"
          placeholder="Buscar por descrição"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="page-status">Carregando…</p>
      ) : error ? (
        <p className="page-status">Não foi possível carregar as despesas.</p>
      ) : expenses.length === 0 ? (
        <p className="procedure-empty">Nenhuma despesa encontrada.</p>
      ) : (
        <div className="expenses-table">
          <div className="expense-row expense-row--head">
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Vencimento</span>
            <span>Destinação</span>
            <span>Status</span>
            <span>Valor</span>
            <span />
          </div>
          {expenses.map((expense) => (
            <div className="expense-row" key={expense.id}>
              <button
                type="button"
                className="row-title"
                onClick={() => navigate(`/financeiro/despesas/${expense.id}`)}
              >
                {expense.description}
                {expense.historicalPending ? <span className="expense-pending-badge"> · pendência</span> : null}
              </button>
              <span className="section-meta">{CATEGORY_LABELS[expense.category] ?? expense.category}</span>
              <span className="section-meta">{expense.dueDate ? formatLongDate(expense.dueDate) : "—"}</span>
              <span className="section-meta">
                {expense.destination === "GENERAL"
                  ? "Geral"
                  : expense.destination === "PROCEDURES"
                    ? "Procedimentos"
                    : expense.destination === "MIXED"
                      ? "Misto"
                      : "—"}
              </span>
              <span className={expense.cancelled ? "active-badge" : expense.paid ? "active-badge is-active" : "active-badge"}>
                {expense.cancelled ? "Cancelada" : expense.paid ? "Paga" : "Pendente"}
              </span>
              <b>{formatPrice(expense.amount)}</b>
              <button type="button" className="section-link" onClick={() => navigate(`/financeiro/despesas/${expense.id}`)}>
                Abrir →
              </button>
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <ExpenseEditor close={() => setCreating(false)} busy={busy} onSubmit={handleCreate} />
      ) : null}
    </div>
  );
}

export function ExpensesPage() {
  const { id } = useParams();
  return (
    <>
      <FinanceNav />
      {id ? <DetailView id={Number(id)} /> : <ListView />}
    </>
  );
}
