import { useCallback, useEffect, useState } from "react";
import {
  getExpenses,
  getFinanceComposition,
  getFinanceEvolution,
  getFinancePendencias,
  getFinanceSummary,
  getSales,
  type ExpenseSummary,
  type FinanceCompositionItem,
  type FinanceEvolutionPoint,
  type FinancePendencias,
  type FinanceSummary,
  type ProcedureRevenue,
  type SaleSummary,
} from "../../../lib/api";

interface State {
  summary: FinanceSummary | null;
  evolution: FinanceEvolutionPoint[];
  composition: FinanceCompositionItem[];
  procedureRevenue: ProcedureRevenue[];
  sales: SaleSummary[];
  expenses: ExpenseSummary[];
  pendencias: FinancePendencias | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: State = {
  summary: null,
  evolution: [],
  composition: [],
  procedureRevenue: [],
  sales: [],
  expenses: [],
  pendencias: null,
  loading: true,
  error: null,
};

export function useFinanceOverview(start: Date, end: Date, evolutionMonths: 1 | 3 | 6 | 12) {
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getFinanceSummary(start, end),
      getFinanceEvolution(evolutionMonths),
      getFinanceComposition(start, end),
      getSales(start, end),
      getExpenses(start, end),
      getFinancePendencias(),
    ])
      .then(([summary, evolution, { composition, procedureRevenue }, sales, expenses, pendencias]) => {
        if (!cancelled) {
          setState({
            summary,
            evolution,
            composition,
            procedureRevenue,
            sales,
            expenses,
            pendencias,
            loading: false,
            error: null,
          });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({ ...EMPTY_STATE, loading: false, error: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [start, end, evolutionMonths, reloadToken]);

  return { ...state, reload };
}
