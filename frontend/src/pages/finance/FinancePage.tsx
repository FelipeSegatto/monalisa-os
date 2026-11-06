import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useFinanceOverview } from "./hooks/useFinanceOverview";
import { FinanceChart } from "./FinanceChart";
import { NewSalePanel } from "./NewSalePanel";
import { NewExpensePanel } from "./NewExpensePanel";
import { SaleDetailPanel } from "./SaleDetailPanel";
import { PaymentPanel } from "./PaymentPanel";
import { FinanceNav } from "../expenses/FinanceNav";
import { formatPrice, formatLongDate } from "../../lib/format";
import {
  cancelSale as cancelSaleApi,
  createExpense as createExpenseApi,
  createSale as createSaleApi,
  getSale,
  getProcedureCategories,
  registerSalePayment as registerSalePaymentApi,
  type CreateExpenseInput,
  type CreateSaleInput,
  type CurrentUser,
  type PaymentMethod,
  type SaleDetail as SaleDetailType,
} from "../../lib/api";
import "./FinancePage.css";

type Panel =
  | { type: "sale" }
  | { type: "expense" }
  | { type: "sale-detail"; sale: SaleDetailType }
  | { type: "sale-payment"; sale: SaleDetailType };

type Section = "Movimentações" | "Vendas" | "Despesas" | "Pendências";
type MovementFilter = "Todos" | "Recebimento" | "Despesa" | "Pendente";

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

export function FinancePage() {
  const user = useOutletContext<CurrentUser | null>();
  const navigate = useNavigate();
  const [now] = useState(() => new Date());
  const [periodMode, setPeriodMode] = useState<"month" | "custom">("month");
  const [customStart, setCustomStart] = useState(
    todayISO().slice(0, 7) + "-01",
  );
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [evolutionMonths, setEvolutionMonths] = useState<1 | 3 | 6 | 12>(6);
  const [section, setSection] = useState<Section>("Movimentações");
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("Todos");
  const [listSearch, setListSearch] = useState("");
  const [listCategory, setListCategory] = useState("");
  const [listStatus, setListStatus] = useState("");
  const [pendingType, setPendingType] = useState("");
  const [pendingStart, setPendingStart] = useState("");
  const [pendingEnd, setPendingEnd] = useState("");
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  useEffect(() => {
    let cancelled = false;
    getProcedureCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const invalidPeriod =
    periodMode === "custom" &&
    (!customStart || !customEnd || customStart > customEnd);
  const { start, end } = useMemo(() => {
    if (periodMode === "month" || invalidPeriod) {
      const month = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
      })
        .format(now)
        .slice(0, 7);
      const start = new Date(month + "-01T03:00:00Z");
      const end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
      return { start, end };
    }
    return {
      start: new Date(`${customStart}T03:00:00Z`),
      end: new Date(
        new Date(`${customEnd}T03:00:00Z`).getTime() + 24 * 60 * 60 * 1000,
      ),
    };
  }, [periodMode, customStart, customEnd, now, invalidPeriod]);

  const {
    summary,
    evolution,
    composition,
    procedureRevenue,
    sales,
    expenses,
    pendencias,
    loading,
    error,
    reload,
  } = useFinanceOverview(start, end, evolutionMonths, !invalidPeriod);

  async function openSale(id: number) {
    const sale = await getSale(id);
    setPanel({ type: "sale-detail", sale });
  }

  function openExpense(id: number) {
    navigate(`/financeiro/despesas/${id}`);
  }

  async function handleSaveSale(input: CreateSaleInput) {
    setSaving(true);
    try {
      const sale = await createSaleApi(input);
      setSaving(false);
      setPanel({ type: "sale-detail", sale });
      reload();
    } catch {
      setSaving(false);
    }
  }

  async function handleSaveExpense(input: CreateExpenseInput) {
    setSaving(true);
    try {
      const expense = await createExpenseApi(input);
      setSaving(false);
      setPanel(null);
      navigate(`/financeiro/despesas/${expense.id}`);
    } catch {
      setSaving(false);
    }
  }

  async function handleRegisterSalePayment(
    saleId: number,
    amount: number,
    method: PaymentMethod,
    installments: number | null,
    requestKey: string,
  ) {
    setSaving(true);
    try {
      const sale = await registerSalePaymentApi(saleId, {
        amount,
        method,
        installments,
        requestKey,
      });
      setSaving(false);
      setPanel({ type: "sale-detail", sale });
      reload();
    } catch {
      setSaving(false);
    }
  }

  async function handleCancelSale(saleId: number) {
    const reason = window.prompt("Motivo do cancelamento da venda");
    if (!reason) return;
    setCancelling(true);
    try {
      const sale = await cancelSaleApi(saleId, reason);
      setCancelling(false);
      setPanel({ type: "sale-detail", sale });
      reload();
    } catch {
      setCancelling(false);
    }
  }

  if (loading && !summary) {
    return <p className="page-status">Carregando…</p>;
  }

  if (error || !summary) {
    return (
      <p className="page-status">Não foi possível carregar o financeiro.</p>
    );
  }

  const expenseCategories = {
    INSUMOS: "Insumos",
    EQUIPAMENTOS_MANUTENCAO: "Equipamentos e manutenção",
    MARKETING: "Marketing",
    ALUGUEL_ESTRUTURA: "Aluguel e estrutura",
    SERVICOS: "Serviços",
    PESSOAL: "Pessoal",
    OUTROS: "Outros",
  };
  const matchesSearch = (text: string) =>
    text
      .toLocaleLowerCase("pt-BR")
      .includes(listSearch.toLocaleLowerCase("pt-BR"));
  const filteredSales = sales.filter(
    (sale) =>
      matchesSearch(`${sale.customerName} ${sale.id}`) &&
      (!listCategory || sale.categoryIds?.includes(Number(listCategory))) &&
      (!listStatus || sale.status === listStatus),
  );
  const filteredExpenses = expenses.filter(
    (expense) =>
      matchesSearch(`${expense.description} ${expense.supplier ?? ""}`) &&
      (!listCategory || expense.category === listCategory) &&
      (!listStatus ||
        (expense.cancelled
          ? "CANCELLED"
          : expense.paid
            ? "PAID"
            : "PENDING") === listStatus),
  );
  const invalidPendingRange = Boolean(
    pendingStart && pendingEnd && pendingStart > pendingEnd,
  );
  const matchesPendingDate = (value: string, isDate = false) => {
    if (invalidPendingRange) return false;
    const day = isDate
      ? value.slice(0, 10)
      : new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
        }).format(new Date(value));
    return (
      (!pendingStart || day >= pendingStart) &&
      (!pendingEnd || day <= pendingEnd)
    );
  };
  const pendingReceivable = (pendencias?.receivable ?? []).filter(
    (sale) =>
      matchesSearch(`${sale.customerName} ${sale.id}`) &&
      matchesPendingDate(sale.createdAt) &&
      !listCategory,
  );
  const pendingPayable = (pendencias?.payable ?? []).filter(
    (expense) =>
      matchesSearch(`${expense.description} ${expense.supplier ?? ""}`) &&
      matchesPendingDate(expense.dueDate, true) &&
      (!listCategory || expense.category === listCategory),
  );

  const movements = [
    ...sales
      .filter((s) => !s.cancelled && s.received > 0)
      .map((s) => ({
        id: `sale-${s.id}`,
        date: s.createdAt,
        title: s.customerName,
        detail: `Venda #${s.id}`,
        method: "—",
        status: s.status === "PAID" ? "Pago" : "Parcial",
        amount: s.received,
        type: "Recebimento" as const,
        onOpen: () => openSale(s.id),
      })),
    ...expenses.map((e) => ({
      id: `expense-${e.id}`,
      date: e.paidAt ?? e.createdAt,
      title: e.description,
      detail: e.categoryLabel,
      method: e.method ?? "—",
      status: e.paid ? "Pago" : "Pendente",
      amount: e.amount,
      type: "Despesa" as const,
      onOpen: () => openExpense(e.id),
    })),
  ]
    .filter(
      (m) =>
        movementFilter === "Todos" ||
        movementFilter === m.type ||
        (movementFilter === "Pendente" && m.status === "Pendente"),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="page">
      <FinanceNav />
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Gestão</p>
          <h1 className="page-header-title">Financeiro</h1>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setPanel({ type: "expense" })}
          >
            Nova despesa
          </button>
          <button
            type="button"
            className="primary-button primary-button-link"
            onClick={() => setPanel({ type: "sale" })}
          >
            Nova venda
          </button>
        </div>
      </header>

      <div className="finance-period">
        <div className="segmented">
          <button
            type="button"
            className={
              periodMode === "month"
                ? "segmented-item is-active"
                : "segmented-item"
            }
            onClick={() => setPeriodMode("month")}
          >
            Este mês
          </button>
          <button
            type="button"
            className={
              periodMode === "custom"
                ? "segmented-item is-active"
                : "segmented-item"
            }
            onClick={() => setPeriodMode("custom")}
          >
            Período personalizado
          </button>
        </div>
        {periodMode === "custom" ? (
          <div className="custom-period">
            <input
              className="text-input"
              type="date"
              aria-label="Início do período financeiro"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
            />
            <span>até</span>
            <input
              className="text-input"
              type="date"
              aria-label="Fim do período financeiro"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
            />
          </div>
        ) : (
          <span className="section-meta">
            {formatLongDate(start.toISOString())} –{" "}
            {formatLongDate(new Date(end.getTime() - 86400000).toISOString())}
          </span>
        )}
      </div>

      {invalidPeriod && (
        <p className="form-error" role="alert">
          Informe um período válido para atualizar os dados. Os indicadores
          exibem o último período carregado.
        </p>
      )}
      <div className="financial-summary">
        {[
          ["Vendas", formatPrice(summary.sales)],
          ["Recebido", formatPrice(summary.received)],
          ["A receber", formatPrice(summary.receivable)],
          ["Despesas pagas", formatPrice(summary.expensesPaid)],
          ["Fluxo líquido", formatPrice(summary.flow)],
          ["Ticket médio", formatPrice(summary.ticketMedio)],
        ].map(([label, value], index) => (
          <div
            className={
              index === 4
                ? "financial-summary-item emphasis"
                : "financial-summary-item"
            }
            key={label}
          >
            <span className="section-meta">{label}</span>
            <b className={index === 4 ? "display" : ""}>{value}</b>
            {index === 4 ? (
              <span className="section-meta">recebido − despesas pagas</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="finance-overview">
        <div>
          <div className="section-header">
            <span className="section-label">Evolução financeira</span>
            <select
              className="select-input chart-period"
              value={evolutionMonths}
              onChange={(e) =>
                setEvolutionMonths(Number(e.target.value) as 1 | 3 | 6 | 12)
              }
            >
              <option value={1}>Último mês</option>
              <option value={3}>Últimos 3 meses</option>
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Último ano</option>
            </select>
          </div>
          <FinanceChart points={evolution} />
        </div>
        <div>
          <div className="section-header">
            <span className="section-label">Composição das vendas</span>
          </div>
          {composition.length === 0 ? (
            <p className="procedure-empty">Sem vendas no período.</p>
          ) : (
            <div className="composition">
              {composition.map((item) => (
                <div key={item.categoryId}>
                  <span>{item.categoryName}</span>
                  <i>
                    <b style={{ width: `${item.percentage}%` }} />
                  </i>
                  <strong>{item.percentage}%</strong>
                </div>
              ))}
            </div>
          )}
          <div className="procedure-revenue">
            {procedureRevenue.slice(0, 4).map((item) => (
              <div key={item.procedureId}>
                <span>{item.procedureName}</span>
                <b>{formatPrice(item.revenue)}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="segmented finance-tabs">
        {(
          ["Movimentações", "Vendas", "Despesas", "Pendências"] as Section[]
        ).map((item) => (
          <button
            type="button"
            key={item}
            className={
              section === item ? "segmented-item is-active" : "segmented-item"
            }
            onClick={() => {
              setSection(item);
              setListSearch("");
              setListCategory("");
              setListStatus("");
              setPendingType("");
              setPendingStart("");
              setPendingEnd("");
            }}
          >
            {item}
          </button>
        ))}
      </div>

      {section !== "Movimentações" && (
        <>
          <section
            className="listing-filters"
            aria-label={`Filtros de ${section.toLowerCase()}`}
          >
            <label className="field">
              Buscar
              <input
                className="text-input"
                value={listSearch}
                onChange={(event) => setListSearch(event.target.value)}
                placeholder={
                  section === "Vendas"
                    ? "Cliente ou número da venda"
                    : "Cliente, descrição ou fornecedor"
                }
              />
            </label>
            {section === "Pendências" && (
              <label className="field">
                Tipo
                <select
                  className="select-input"
                  value={pendingType}
                  onChange={(event) => {
                    setPendingType(event.target.value);
                    setListCategory("");
                  }}
                >
                  <option value="">A receber e a pagar</option>
                  <option value="receivable">A receber</option>
                  <option value="payable">A pagar</option>
                </select>
              </label>
            )}
            {(section !== "Pendências" || pendingType === "payable") && (
              <label className="field">
                {section === "Vendas"
                  ? "Categoria do procedimento"
                  : "Categoria da despesa"}
                <select
                  className="select-input"
                  value={listCategory}
                  onChange={(event) => setListCategory(event.target.value)}
                >
                  <option value="">Todas</option>
                  {section === "Vendas"
                    ? categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    : Object.entries(expenseCategories).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                </select>
              </label>
            )}
            {section !== "Pendências" && (
              <label className="field">
                Status
                <select
                  className="select-input"
                  value={listStatus}
                  onChange={(event) => setListStatus(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendente</option>
                  {section === "Vendas" && (
                    <option value="PARTIAL">Parcial</option>
                  )}
                  <option value="PAID">Paga</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </label>
            )}
            {section === "Pendências" && (
              <div className="listing-period">
                <label className="field">
                  A partir de
                  <input
                    className="text-input"
                    type="date"
                    value={pendingStart}
                    max={pendingEnd || undefined}
                    onChange={(event) => setPendingStart(event.target.value)}
                  />
                </label>
                <label className="field">
                  Até
                  <input
                    className="text-input"
                    type="date"
                    value={pendingEnd}
                    min={pendingStart || undefined}
                    onChange={(event) => setPendingEnd(event.target.value)}
                  />
                </label>
              </div>
            )}
            <button
              className="text-button listing-clear"
              type="button"
              disabled={
                !(
                  listSearch ||
                  listCategory ||
                  listStatus ||
                  pendingType ||
                  pendingStart ||
                  pendingEnd
                )
              }
              onClick={() => {
                setListSearch("");
                setListCategory("");
                setListStatus("");
                setPendingType("");
                setPendingStart("");
                setPendingEnd("");
              }}
            >
              Limpar filtros
            </button>
          </section>
          <p className="section-meta">
            {section === "Pendências"
              ? "Período pela data da venda em valores a receber e pelo vencimento em despesas a pagar. Sem período selecionado, mostra todas as pendências."
              : section === "Vendas"
                ? "Listagem pela data da venda no período selecionado acima. Os filtros abaixo não alteram os indicadores do período."
                : "Listagem pelo vencimento no período selecionado acima. Os filtros não alteram os indicadores do período."}
          </p>
          {invalidPendingRange && section === "Pendências" && (
            <p className="form-error" role="alert">
              A data inicial deve ser anterior ou igual à final.
            </p>
          )}
          {section === "Vendas" && !filteredSales.length && (
            <p className="procedure-empty">
              Nenhuma venda encontrada com estes filtros.
            </p>
          )}
          {section === "Despesas" && !filteredExpenses.length && (
            <p className="procedure-empty">
              Nenhuma despesa encontrada com estes filtros.
            </p>
          )}
          {section === "Pendências" &&
            !(pendingType === "payable"
              ? pendingPayable.length
              : pendingType === "receivable"
                ? pendingReceivable.length
                : pendingPayable.length + pendingReceivable.length) && (
              <p className="procedure-empty">
                Nenhuma pendência encontrada com estes filtros.
              </p>
            )}
        </>
      )}

      {section === "Movimentações" ? (
        <>
          <div className="movement-tools">
            <div className="segmented">
              {(
                [
                  "Todos",
                  "Recebimento",
                  "Despesa",
                  "Pendente",
                ] as MovementFilter[]
              ).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={
                    movementFilter === item
                      ? "segmented-item is-active"
                      : "segmented-item"
                  }
                  onClick={() => setMovementFilter(item)}
                >
                  {item === "Recebimento"
                    ? "Recebimentos"
                    : item === "Despesa"
                      ? "Despesas"
                      : item === "Pendente"
                        ? "Pendentes"
                        : item}
                </button>
              ))}
            </div>
          </div>
          <div className="movement-list">
            {movements.length === 0 ? (
              <p className="procedure-empty">
                Nenhuma movimentação no período.
              </p>
            ) : (
              movements.map((item) => (
                <div className="movement-row" key={item.id}>
                  <span className="section-meta">
                    {formatLongDate(item.date)}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="row-title"
                      onClick={item.onOpen}
                    >
                      {item.title}
                    </button>
                    <p className="client-row-sub">{item.detail}</p>
                  </div>
                  <span className="section-meta">{item.method}</span>
                  <span
                    className={
                      item.status === "Pendente"
                        ? "active-badge"
                        : "active-badge is-active"
                    }
                  >
                    {item.status}
                  </span>
                  <b>
                    {item.type === "Despesa" ? "− " : "+ "}
                    {formatPrice(item.amount)}
                  </b>
                  <button
                    type="button"
                    className="section-link"
                    onClick={item.onOpen}
                  >
                    Abrir →
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}

      {section === "Vendas" ? (
        <div className="sales-table">
          <div className="sales-row sales-row--head">
            <span>Data</span>
            <span>Cliente</span>
            <span>Total</span>
            <span>Recebido</span>
            <span>A receber</span>
            <span>Status</span>
            <span />
          </div>
          {filteredSales.map((sale) => (
            <div className="sales-row" key={sale.id}>
              <span className="section-meta">
                {formatLongDate(sale.createdAt)}
              </span>
              <button
                type="button"
                className="row-title"
                onClick={() => openSale(sale.id)}
              >
                {sale.customerName}
              </button>
              <b>{formatPrice(sale.total)}</b>
              <span>{formatPrice(sale.received)}</span>
              <span>{formatPrice(sale.balance)}</span>
              <span
                className={
                  sale.status === "PAID"
                    ? "active-badge is-active"
                    : "active-badge"
                }
              >
                {sale.status === "PAID"
                  ? "Paga"
                  : sale.status === "PARTIAL"
                    ? "Parcial"
                    : sale.status === "CANCELLED"
                      ? "Cancelada"
                      : "Pendente"}
              </span>
              <button
                type="button"
                className="section-link"
                onClick={() => openSale(sale.id)}
              >
                Abrir →
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {section === "Despesas" ? (
        <div className="expenses-table">
          <div className="expense-row expense-row--head">
            <span>Data</span>
            <span>Descrição</span>
            <span>Categoria</span>
            <span>Vencimento</span>
            <span>Status</span>
            <span>Valor</span>
            <span />
          </div>
          {filteredExpenses.map((expense) => (
            <div className="expense-row" key={expense.id}>
              <span className="section-meta">
                {formatLongDate(expense.createdAt)}
              </span>
              <button
                type="button"
                className="row-title"
                onClick={() => openExpense(expense.id)}
              >
                {expense.description}
              </button>
              <span className="section-meta">{expense.categoryLabel}</span>
              <span className="section-meta">
                {formatLongDate(expense.dueDate)}
              </span>
              <span
                className={
                  expense.paid ? "active-badge is-active" : "active-badge"
                }
              >
                {expense.cancelled
                  ? "Cancelada"
                  : expense.paid
                    ? "Pago"
                    : "Pendente"}
              </span>
              <b>{formatPrice(expense.amount)}</b>
              <button
                type="button"
                className="section-link"
                onClick={() => openExpense(expense.id)}
              >
                Abrir →
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {section === "Pendências" && pendencias ? (
        <div className="pending-columns">
          {pendingType !== "payable" && (
            <div>
              <div className="section-header">
                <span className="section-label">A receber</span>
                <span className="section-meta">
                  {formatPrice(
                    pendingReceivable.reduce(
                      (sum, sale) => sum + sale.balance,
                      0,
                    ),
                  )}
                </span>
              </div>
              {pendingReceivable.map((sale) => (
                <div className="pending-row" key={sale.id}>
                  <div>
                    <button
                      type="button"
                      className="row-title"
                      onClick={() => openSale(sale.id)}
                    >
                      {sale.customerName}
                    </button>
                    <p className="client-row-sub">Venda #{sale.id}</p>
                  </div>
                  <b>{formatPrice(sale.balance)}</b>
                  <button
                    type="button"
                    className="section-link"
                    onClick={() => openSale(sale.id)}
                  >
                    Abrir →
                  </button>
                </div>
              ))}
            </div>
          )}
          {pendingType !== "receivable" && (
            <div>
              <div className="section-header">
                <span className="section-label">A pagar</span>
                <span className="section-meta">
                  {formatPrice(
                    pendingPayable.reduce((sum, e) => sum + e.amount, 0),
                  )}
                </span>
              </div>
              {pendingPayable.map((expense) => (
                <div className="pending-row" key={expense.id}>
                  <div>
                    <button
                      type="button"
                      className="row-title"
                      onClick={() => openExpense(expense.id)}
                    >
                      {expense.description}
                    </button>
                    <p className="client-row-sub">
                      Vence {formatLongDate(expense.dueDate)}
                    </p>
                  </div>
                  <b>{formatPrice(expense.amount)}</b>
                  <button
                    type="button"
                    className="section-link"
                    onClick={() => openExpense(expense.id)}
                  >
                    Abrir →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {panel?.type === "sale" ? (
        <NewSalePanel
          close={() => setPanel(null)}
          save={handleSaveSale}
          saving={saving}
          currentUser={user}
        />
      ) : null}
      {panel?.type === "expense" ? (
        <NewExpensePanel
          close={() => setPanel(null)}
          save={handleSaveExpense}
          saving={saving}
        />
      ) : null}
      {panel?.type === "sale-detail" ? (
        <SaleDetailPanel
          sale={panel.sale}
          close={() => setPanel(null)}
          onRegisterPayment={() =>
            setPanel({ type: "sale-payment", sale: panel.sale })
          }
          onCancel={() => handleCancelSale(panel.sale.id)}
          cancelling={cancelling}
        />
      ) : null}
      {panel?.type === "sale-payment" ? (
        <PaymentPanel
          balance={panel.sale.balance}
          close={() => setPanel({ type: "sale-detail", sale: panel.sale })}
          saving={saving}
          save={(amount, method, installments, requestKey) =>
            handleRegisterSalePayment(
              panel.sale.id,
              amount,
              method,
              installments,
              requestKey,
            )
          }
        />
      ) : null}
    </div>
  );
}
