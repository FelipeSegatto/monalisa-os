import { useEffect, useState } from "react";
import { getProfessionals, type ProfessionalDetail } from "../../../lib/api";

interface State {
  data: ProfessionalDetail[] | null;
  loading: boolean;
  error: string | null;
}

export function useProfessionals() {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    getProfessionals()
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
