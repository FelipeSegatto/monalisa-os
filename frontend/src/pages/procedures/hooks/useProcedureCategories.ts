import { useEffect, useState } from "react";
import { getProcedureCategories, type ProcedureCategory } from "../../../lib/api";

interface State {
  data: ProcedureCategory[] | null;
  loading: boolean;
  error: string | null;
}

export function useProcedureCategories() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    getProcedureCategories()
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
  }, []);

  return state;
}
