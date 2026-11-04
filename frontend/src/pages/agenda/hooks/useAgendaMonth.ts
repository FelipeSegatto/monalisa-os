import { useEffect, useState } from "react";
import { getAgendaMonth, type AgendaMonth } from "../../../lib/api";

interface State {
  data: AgendaMonth | null;
  loading: boolean;
  error: string | null;
}

export function useAgendaMonth(date: string, enabled: boolean) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getAgendaMonth(date)
      .then((data) => {
        if (!cancelled) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [date, enabled]);

  return state;
}
