import { ProcedureActivitySection } from "./components/ProcedureActivitySection";
import { MaintenanceReminders } from "../equipment/MaintenanceReminders";
import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useDashboardOverview } from "./hooks/useDashboardOverview";
import { DashboardHeader } from "./components/DashboardHeader";
import { TodaySection } from "./components/TodaySection";
import { AgendaAndAttentionSection } from "./components/AgendaAndAttentionSection";
import { PeriodPerformanceSection } from "./components/PeriodPerformanceSection";
import { MyFinanceSection } from "./components/MyFinanceSection";
import { ObservationsSection } from "./components/ObservationsSection";
import { NewAppointmentPanel } from "../agenda/NewAppointmentPanel";
import type { AdminDashboardOverview, CurrentUser } from "../../lib/api";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DashboardPage() {
  const user = useOutletContext<CurrentUser | null>();
  const { data, loading, error, reload } = useDashboardOverview();
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [todayKey] = useState(() => toDateKey(new Date()));

  if (loading) {
    return <p className="page-status">Carregando…</p>;
  }

  if (error || !data) {
    return <p className="page-status">Não foi possível carregar o dashboard.</p>;
  }

  return (
    <div className="page">
      <DashboardHeader onNewAppointment={() => setShowNewAppointment(true)} user={user} />
      <TodaySection overview={data} />
      <MaintenanceReminders />
      {user?.role === "ADMIN" && <ProcedureActivitySection />}
      <AgendaAndAttentionSection overview={data} />
      {user?.role === "FUNCIONARIO" ? (
        <MyFinanceSection overview={data} />
      ) : (
        <PeriodPerformanceSection overview={data as AdminDashboardOverview} />
      )}
      <ObservationsSection overview={data} />

      {showNewAppointment ? (
        <NewAppointmentPanel
          defaultDateKey={todayKey}
          close={() => setShowNewAppointment(false)}
          onCreated={() => {
            setShowNewAppointment(false);
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
