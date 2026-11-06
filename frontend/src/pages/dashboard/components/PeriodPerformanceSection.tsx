import { Link } from "react-router-dom";
import type { AdminDashboardOverview } from "../../../lib/api";
import { formatPrice } from "../../../lib/format";
import "./PeriodPerformanceSection.css";

interface Props {
  overview: AdminDashboardOverview;
}

const UNIT_THRESHOLD = 30;

function formatChange(changePercent: number | null): { text: string; className: string } {
  if (changePercent === null) {
    return { text: "Novo", className: "change-badge is-new" };
  }
  if (changePercent > 0) {
    return { text: `▲ ${changePercent}%`, className: "change-badge is-up" };
  }
  if (changePercent < 0) {
    return { text: `▼ ${Math.abs(changePercent)}%`, className: "change-badge is-down" };
  }
  return { text: "—", className: "change-badge" };
}

function formatMonthLabel(month: string): { title: string; range: string } {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(year, monthIndex - 1, 1);
  const lastDay = new Date(year, monthIndex, 0).getDate();

  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date);
  const title = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return {
    title,
    range: `1 a ${lastDay} de ${monthName} · dados registrados no sistema`,
  };
}

export function PeriodPerformanceSection({ overview }: Props) {
  const { period, finance, monthlyInsights } = overview;
  const { title, range } = formatMonthLabel(period.month);
  const maxCount = Math.max(1, ...period.newCustomersBySource.map((s) => s.count));
  const topProcedures = monthlyInsights.procedures.top;
  const { topMover, topDecline } = monthlyInsights.procedures;
  const topExpenseCategories = monthlyInsights.expenses.top;
  const topProcedureShare =
    topProcedures.length > 0 && finance.sales > 0
      ? Math.round((topProcedures[0].revenue / finance.sales) * 100)
      : null;

  return (
    <>
      <div className="management-intro">
        <p className="section-label">Gestão</p>
        <h2 className="management-title">Como o negócio está performando?</h2>
        <p className="period-range management-period">
          {title} <span>{range}</span>
        </p>
      </div>

      <section className="management-section">
        <div className="section-header">
          <span className="section-label">Financeiro</span>
          <Link to="/financeiro" className="section-link">
            Ver financeiro →
          </Link>
        </div>
        <div className="finance-editorial">
          <div className="finance-editorial-primary">
            <span className="section-meta">Fluxo líquido</span>
            <strong className="display">{formatPrice(finance.flow)}</strong>
            <span className="section-meta">Recebimentos menos despesas pagas</span>
          </div>
          <div className="finance-editorial-values">
            {[
              ["Vendas", finance.sales],
              ["Recebido", finance.received],
              ["Pendente", finance.receivable],
              ["Despesas", finance.expensesPaid],
              ["Ticket médio", finance.ticketMedio],
            ].map(([label, value]) => (
              <div key={label as string}>
                <span className="section-meta">{label}</span>
                <b>{formatPrice(value as number)}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="management-section">
        <div className="section-header">
          <span className="section-label">Procedimentos</span>
          <Link to="/procedimentos" className="section-link">
            Gerenciar →
          </Link>
        </div>
        {topProcedures.length === 0 ? (
          <p className="procedure-empty">Nenhuma venda registrada neste período.</p>
        ) : (
          <div className="procedure-performance">
            {topProcedureShare !== null ? (
              <div className="statement">
                <strong className="display">{topProcedureShare}%</strong>
                <span>
                  da receita deste mês veio de {topProcedures[0].procedureName}.
                </span>
              </div>
            ) : null}
            <div className="performance-table">
              <div className="table-head">
                <span>Procedimento</span>
                <span>Receita</span>
                <span>Sessões</span>
                <span>Ticket</span>
                <span>Variação</span>
              </div>
              {topProcedures.map((item) => {
                const change = formatChange(item.changePercent);
                return (
                  <div className="table-line" key={item.procedureId}>
                    <span>{item.procedureName}</span>
                    <span>{formatPrice(item.revenue)}</span>
                    <span>{item.sessions}</span>
                    <span>{formatPrice(item.ticket)}</span>
                    <span className={change.className}>{change.text}</span>
                  </div>
                );
              })}
            </div>
            {topMover ? (
              <p className="performance-callout is-up">
                ▲ {topMover.procedureName} cresceu {topMover.changePercent}% em relação ao mês
                passado.
              </p>
            ) : null}
            {topDecline ? (
              <p className="performance-callout is-down">
                ▼ {topDecline.procedureName} caiu {Math.abs(topDecline.changePercent ?? 0)}% em
                relação ao mês passado.
              </p>
            ) : null}
          </div>
        )}
      </section>

      <div className="management-columns">
        <section className="management-section">
          <div className="section-header">
            <span className="section-label">Despesas</span>
            <Link to="/financeiro" className="section-link">
              Ver financeiro →
            </Link>
          </div>
          {topExpenseCategories.length === 0 ? (
            <p className="procedure-empty">Nenhuma despesa paga neste período.</p>
          ) : (
            <div className="performance-table performance-table--expenses">
              <div className="table-head">
                <span>Categoria</span>
                <span>Valor</span>
                <span>Variação</span>
              </div>
              {topExpenseCategories.map((item) => {
                const change = formatChange(item.changePercent);
                return (
                  <div className="table-line" key={item.category}>
                    <span>{item.categoryLabel}</span>
                    <span>{formatPrice(item.amount)}</span>
                    <span className={change.className}>{change.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="management-section">
          <div className="section-header">
            <span className="section-label">Clientes</span>
            <Link to="/clientes" className="section-link">
              Ver clientes →
            </Link>
          </div>
          <div className="client-numbers">
            <div>
              <strong className="display">{period.attendedCustomers}</strong>
              <span className="section-meta">clientes atendidos</span>
            </div>
            <div>
              <b>{period.totalNewCustomers}</b>
              <span className="section-meta">novos clientes</span>
            </div>
            <div>
              <b>{period.returningCustomers}</b>
              <span className="section-meta">retornaram</span>
            </div>
          </div>
          <p className="section-label client-numbers-label">Origem dos novos clientes</p>
          <div className="new-customers-list">
            {period.newCustomersBySource.map((source) => (
              <div className="new-customers-row" key={source.source}>
                <span className="new-customers-source">{source.label}</span>
                <div className="new-customers-visual">
                  {source.count === 0 ? null : source.count > UNIT_THRESHOLD ? (
                    <div className="new-customers-bar-track">
                      <div
                        className="new-customers-bar-fill"
                        style={{ width: `${(source.count / maxCount) * 100}%` }}
                      />
                    </div>
                  ) : (
                    <div className="new-customers-units">
                      {Array.from({ length: source.count }).map((_, index) => (
                        <span className="new-customers-unit" key={index} />
                      ))}
                    </div>
                  )}
                </div>
                <span className="new-customers-count">{source.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
