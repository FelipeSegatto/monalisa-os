import { useEffect, useState } from "react";
import { formatPrice } from "../../lib/format";
import { getExpensePerformance, type ProcedureComparisonRow } from "./api";
import "./expenses.css";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function ExpensePerformanceSection() {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState<ProcedureComparisonRow[]>([]);
  const [previousMonth, setPreviousMonth] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getExpensePerformance(month)
      .then((data) => {
        setRows(data.procedures);
        setPreviousMonth(data.previousMonth);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div>
      <div className="section-header">
        <span className="section-label">Resultado por procedimento</span>
        <input
          className="text-input"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>
      <p className="section-meta">
        Resultado do período = vendido − despesa atribuída. Saldo de caixa = recebido − despesas
        pagas (líquido de estornos). Não é lucro real por sessão.
      </p>
      {loading ? (
        <p className="page-status">Carregando…</p>
      ) : error ? (
        <p className="page-status">Não foi possível carregar as métricas.</p>
      ) : rows.length === 0 ? (
        <p className="procedure-empty">Sem movimentação no período.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="expense-metrics-table">
            <thead>
              <tr>
                <th>Procedimento</th>
                <th>Vendido</th>
                <th>Recebido</th>
                <th>Despesa atribuída</th>
                <th>Despesa paga (líq.)</th>
                <th>Execuções</th>
                <th>Resultado</th>
                <th>Saldo de caixa</th>
                <th>vs. {previousMonth}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.procedureId)}>
                  <td>{row.procedureName ?? "Geral / não atribuído"}</td>
                  <td>{formatPrice(row.sold)}</td>
                  <td>{formatPrice(row.received)}</td>
                  <td>{formatPrice(row.expenseAttributed)}</td>
                  <td>{formatPrice(row.expensePaidNet)}</td>
                  <td>{row.executions}</td>
                  <td>{formatPrice(row.periodResult)}</td>
                  <td>{formatPrice(row.cashBalance)}</td>
                  <td>{row.changePercent === null ? "—" : `${row.changePercent > 0 ? "+" : ""}${row.changePercent}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
