import { useCallback, useEffect, useState } from "react";
import { getDashboardOverview, type DashboardOverview } from "../../../lib/api";

interface State {
  data: DashboardOverview | null;
  loading: boolean;
  error: string | null;
}

export function useDashboardOverview() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });
  const [reloadToken, setReloadToken] = useState(0);
  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    getDashboardOverview()
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
  }, [reloadToken]);

  return { ...state, reload };
}
