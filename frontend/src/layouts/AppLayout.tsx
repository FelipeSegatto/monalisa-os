import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { getCurrentUser, type CurrentUser } from "../lib/api";
import "./AppLayout.css";

export function AppLayout() {
  const location = useLocation();
  const [state, setState] = useState<{ user: CurrentUser | null; loading: boolean }>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled) setState({ user, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ user: null, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading) {
    return <p className="page-status">Carregando…</p>;
  }

  if (!state.user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar user={state.user} />
      <main className="app-content">
        <Outlet context={state.user} />
      </main>
    </div>
  );
}
