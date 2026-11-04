import { useCallback, useEffect, useState } from "react";
import { getAgenda, type Agenda } from "../../../lib/api";

interface State {
  data: Agenda | null;
  loading: boolean;
  error: string | null;
}

export function useAgenda(date: string) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    getAgenda(date)
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
  }, [date, reloadToken]);

  return { ...state, reload };
}
