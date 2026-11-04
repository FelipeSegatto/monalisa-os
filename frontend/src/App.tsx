import { EquipmentPage } from "./pages/equipment/EquipmentPage";
import { EquipmentDetailPage } from "./pages/equipment/EquipmentDetailPage";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { AgendaPage } from "./pages/agenda/AgendaPage";
import { ProceduresPage } from "./pages/procedures/ProceduresPage";
import { ProcedureDetailPage } from "./pages/procedures/ProcedureDetailPage";
import { ProfessionalsPage } from "./pages/professionals/ProfessionalsPage";
import { ProfessionalDetailPage } from "./pages/professionals/ProfessionalDetailPage";
import { ClientsPage } from "./pages/clients/ClientsPage";
import { ClientNewPage } from "./pages/clients/ClientNewPage";
import { ClientProfilePage } from "./pages/clients/ClientProfilePage";
import { FinancePage } from "./pages/finance/FinancePage";
import { StockPage } from "./pages/stock/StockPage";
import { LeadsPage } from "./pages/leads/LeadsPage";
import { CatalogPage } from "./pages/public/CatalogPage";
import { LoginPage } from "./pages/auth/LoginPage";

export default function App() {
  return (
    <Routes>
      {/* Backend/admin ainda sem deploy - raiz aponta pro catalogo publico
          por enquanto. Reverter para <DashboardPage /> quando a API estiver
          no ar. */}
      <Route index element={<Navigate to="/catalogo" replace />} />
      <Route path="catalogo" element={<CatalogPage />} />
      <Route path="login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="clientes" element={<ClientsPage />} />
        <Route path="clientes/novo" element={<ClientNewPage />} />
        <Route path="clientes/:id" element={<ClientProfilePage />} />
        <Route path="procedimentos" element={<ProceduresPage />} />
        <Route path="procedimentos/novo" element={<ProcedureDetailPage isNew />} />
        <Route path="procedimentos/:id" element={<ProcedureDetailPage />} />
        <Route path="profissionais" element={<ProfessionalsPage />} />
        <Route path="profissionais/novo" element={<ProfessionalDetailPage isNew />} />
        <Route path="profissionais/:id" element={<ProfessionalDetailPage />} />
        <Route path="financeiro" element={<FinancePage />} />
        <Route path="equipamentos" element={<EquipmentPage />} />
        <Route path="equipamentos/:id" element={<EquipmentDetailPage />} />
        <Route path="estoque" element={<StockPage />} />
        <Route path="leads" element={<LeadsPage />} />
      </Route>
    </Routes>
  );
}
