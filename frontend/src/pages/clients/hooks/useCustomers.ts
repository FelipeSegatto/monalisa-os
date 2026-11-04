import { useEffect, useState } from "react";
import { getCustomers, type AcquisitionSource, type CustomerListItem } from "../../../lib/api";

interface State {
  data: CustomerListItem[] | null;
  loading: boolean;
  error: string | null;
}

export function useCustomers(search: string, source: AcquisitionSource | null) {
  const [state, setState] = useState<State>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    getCustomers({ search: search || undefined, source: source ?? undefined })
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
  }, [search, source]);

  return state;
}
