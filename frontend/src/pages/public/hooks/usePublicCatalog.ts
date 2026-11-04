import { useEffect, useState } from "react";
import { getPublicCatalog, type ProcedureCategory } from "../../../lib/api";

interface State {
  categories: ProcedureCategory[];
  loading: boolean;
  error: string | null;
}

export function usePublicCatalog() {
  const [state, setState] = useState<State>({ categories: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    getPublicCatalog()
      .then((categories) => {
        if (!cancelled) {
          setState({ categories, loading: false, error: null });
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setState({ categories: [], loading: false, error: error.message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
