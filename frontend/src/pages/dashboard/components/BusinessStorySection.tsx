import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../../lib/format";
import {
  getExpenseSeries,
  getOccupancySeries,
  getOfferSeries,
  type ExpenseSeriesResponse,
  type OccupancySeriesEntry,
  type OfferSeriesEntry,
} from "../../../lib/api";
import { LineSeriesChart } from "./LineSeriesChart";
import "./BusinessStorySection.css";

// Validated categorical triplet (dataviz skill, default palette slots 1-3): all-pairs CVD-safe.
const COLOR_SOLD = "#2a78d6";
const COLOR_EXPENSE = "#eb6834";
const COLOR_RESULT = "#1baf7a";

function changeLabel(current: number, previous: number): { text: string; className: string } {
  if (previous === 0) {
    if (current === 0) return { text: "—", className: "change-badge" };
    return { text: "Novo", className: "change-badge is-new" };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  if (pct > 0) return { text: `▲ ${pct}%`, className: "change-badge is-up" };
  if (pct < 0) return { text: `▼ ${Math.abs(pct)}%`, className: "change-badge is-down" };
  return { text: "—", className: "change-badge" };
}

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}
function secondLast<T>(arr: T[]): T {
  return arr[Math.max(0, arr.length - 2)];
}

export function BusinessStorySection() {
  const [months, setMonths] = useState<6 | 12>(6);
  const [expenseData, setExpenseData] = useState<ExpenseSeriesResponse | null>(null);
  const [offers, setOffers] = useState<OfferSeriesEntry[]>([]);
  const [offerMonths, setOfferMonths] = useState<string[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancySeriesEntry[]>([]);
  const [error, setError] = useState("");
  const [selectedProcedureId, setSelectedProcedureId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError("");
    Promise.all([getExpenseSeries(months), getOfferSeries(months), getOccupancySeries(months)])
      .then(([expense, offerSeries, occupancySeries]) => {
        if (cancelled) return;
        setExpenseData(expense);
        setOffers(offerSeries.offers);
        setOfferMonths(offerSeries.months);
        setOccupancy(occupancySeries.professionals);
        if (expense.procedures.length && selectedProcedureId === null) {
          const top = [...expense.procedures]
            .filter((p) => p.procedureId !== null)
            .sort((a, b) => last(b.sold) - last(a.sold))[0];
          if (top) setSelectedProcedureId(top.procedureId);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const totalSeries = useMemo(() => {
    if (!expenseData?.total) return null;
    return [
      { key: "sold", label: "Faturamento", color: COLOR_SOLD, values: expenseData.total.sold },
      { key: "expense", label: "Despesa atribuída", color: COLOR_EXPENSE, values: expenseData.total.expenseAttributed },
      { key: "result", label: "Resultado", color: COLOR_RESULT, values: expenseData.total.result },
    ];
  }, [expenseData]);

  const selectedProcedure = expenseData?.procedures.find((p) => p.procedureId === selectedProcedureId) ?? null;
  const procedureSeries = selectedProcedure
    ? [
        { key: "sold", label: "Faturamento", color: COLOR_SOLD, values: selectedProcedure.sold },
        { key: "expense", label: "Despesa atribuída", color: COLOR_EXPENSE, values: selectedProcedure.expenseAttributed },
        { key: "result", label: "Resultado", color: COLOR_RESULT, values: selectedProcedure.result },
      ]
    : null;

  const topOffers = useMemo(
    () => [...offers].sort((a, b) => last(b.sold) - last(a.sold)).slice(0, 6),
    [offers],
  );
  const maxOfferSold = Math.max(1, ...topOffers.map((o) => last(o.sold)));

  if (error) return null;
  if (!expenseData) return <p className="page-status">Carregando história de performance…</p>;

  const receivedLatest = expenseData.total ? last(expenseData.total.received) : 0;
  const cashBalanceLatest = expenseData.total ? last(expenseData.total.cashBalance) : 0;
  const soldChange = expenseData.total
    ? changeLabel(last(expenseData.total.sold), secondLast(expenseData.total.sold))
    : null;
  const resultChange = expenseData.total
    ? changeLabel(last(expenseData.total.result), secondLast(expenseData.total.result))
    : null;

  return (
    <>
      <div className="management-intro">
        <p className="section-label">Gestão</p>
        <h2 className="management-title">A história do negócio</h2>
        <p className="period-range management-period">
          <span>Faturamento, despesa atribuída e resultado ao longo do tempo</span>
        </p>
      </div>

      <div className="story-filter-row">
        <div className="segmented">
          <button type="button" className={months === 6 ? "segmented-item is-active" : "segmented-item"} onClick={() => setMonths(6)}>
            6 meses
          </button>
          <button type="button" className={months === 12 ? "segmented-item is-active" : "segmented-item"} onClick={() => setMonths(12)}>
            12 meses
          </button>
        </div>
      </div>

      <section className="management-section">
        <div className="section-header">
          <span className="section-label">Total da clínica</span>
          <Link to="/financeiro" className="section-link">
            Ver financeiro →
          </Link>
        </div>
        <div className="story-hero">
          {totalSeries ? (
            <LineSeriesChart months={expenseData.months} series={totalSeries} formatValue={formatPrice} />
          ) : (
            <p className="procedure-empty">Sem movimentação no período.</p>
          )}
          <div className="story-hero-stats">
            <div>
              <span className="section-meta">Recebido (mês atual)</span>
              <b>{formatPrice(receivedLatest)}</b>
            </div>
            <div>
              <span className="section-meta">Saldo de caixa (mês atual)</span>
              <b>{formatPrice(cashBalanceLatest)}</b>
            </div>
            {soldChange ? (
              <div>
                <span className="section-meta">Faturamento vs mês anterior</span>
                <b className={soldChange.className}>{soldChange.text}</b>
              </div>
            ) : null}
            {resultChange ? (
              <div>
                <span className="section-meta">Resultado vs mês anterior</span>
                <b className={resultChange.className}>{resultChange.text}</b>
              </div>
            ) : null}
          </div>
        </div>
        <p className="section-meta story-footnote">
          Resultado = faturamento − despesa atribuída por competência. Saldo de caixa = recebido −
          despesas pagas líquidas de estornos. Não é lucro contábil exato — despesas de combos/ofertas
          não têm rateio aprovado e por isso não entram no resultado por procedimento quando vendidas
          via combo.
        </p>
      </section>

      <div className="management-columns">
        <section className="management-section">
          <div className="section-header">
            <span className="section-label">Por procedimento</span>
            {expenseData.procedures.length ? (
              <select
                className="select-input"
                value={selectedProcedureId ?? ""}
                onChange={(e) => setSelectedProcedureId(e.target.value ? Number(e.target.value) : null)}
              >
                {expenseData.procedures.map((p) => (
                  <option key={String(p.procedureId)} value={p.procedureId ?? ""}>
                    {p.procedureName ?? "Geral / não atribuído"}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          {procedureSeries ? (
            <>
              <LineSeriesChart months={expenseData.months} series={procedureSeries} formatValue={formatPrice} height={180} />
              {selectedProcedure ? (
                <p className="section-meta story-footnote">
                  {last(selectedProcedure.executions)} execuções no mês atual.
                </p>
              ) : null}
            </>
          ) : (
            <p className="procedure-empty">Sem procedimentos com movimentação no período.</p>
          )}
        </section>

        <div className="management-side-stack">
          <section className="management-section">
            <div className="section-header">
              <span className="section-label">Combos e ofertas mais vendidos</span>
              <Link to="/comercial/ofertas" className="section-link">
                Ver ofertas →
              </Link>
            </div>
            {topOffers.length === 0 ? (
              <p className="procedure-empty">Nenhum combo vendido no período.</p>
            ) : (
              <div className="story-offer-bars">
                {topOffers.map((offer) => {
                  const value = last(offer.sold);
                  return (
                    <div className="story-offer-row" key={offer.offerId}>
                      <span className="story-offer-name">{offer.offerName}</span>
                      <div className="story-offer-track">
                        <div
                          className="story-offer-fill"
                          style={{ width: `${Math.max(2, (value / maxOfferSold) * 100)}%` }}
                        />
                      </div>
                      <span className="story-offer-value">{formatPrice(value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="section-meta story-footnote">
              Vendido no mês atual ({offerMonths.length ? last(offerMonths) : "—"}). Só receita — sem
              despesa/resultado próprios, pois não há regra aprovada de rateio por combo.
            </p>
          </section>

          <section className="management-section">
            <div className="section-header">
              <span className="section-label">Ocupação da agenda</span>
            </div>
            {occupancy.length === 0 ? (
              <p className="procedure-empty">Nenhum profissional com jornada cadastrada ainda.</p>
            ) : (
              <div className="story-occupancy-list">
                {occupancy.map((p) => {
                  const pct = last(p.occupancyPercent);
                  return (
                    <div className="story-occupancy-row" key={p.professionalId}>
                      <span className="story-occupancy-name">{p.name}</span>
                      <div className="story-occupancy-track">
                        <div className="story-occupancy-fill" style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                      </div>
                      <span className="story-occupancy-value">{pct === null ? "—" : `${pct}%`}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
