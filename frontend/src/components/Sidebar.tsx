import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { CLINIC_NAME } from "../config/clinic";
import { logout, type CurrentUser } from "../lib/api";
import "./Sidebar.css";

interface NavItem {
  label: string;
  to: string;
  available: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", available: true },
  { label: "Agenda", to: "/agenda", available: true },
  { label: "Clientes", to: "/clientes", available: true },
  { label: "Procedimentos", to: "/procedimentos", available: true },
  { label: "Profissionais", to: "/profissionais", available: true, adminOnly: true },
  { label: "Equipamentos", to: "/equipamentos", available: true },
  { label: "Estoque", to: "/estoque", available: true, adminOnly: true },
  { label: "Financeiro", to: "/financeiro", available: true },
  { label: "Leads", to: "/leads", available: true, adminOnly: true },
];

interface Props {
  user: CurrentUser;
}

export function Sidebar({ user }: Props) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user.role === "ADMIN");

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <p className="sidebar-brand-name">{CLINIC_NAME}</p>
        <p className="sidebar-brand-label">Gestão</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) =>
          item.available ? (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "sidebar-nav-item is-active" : "sidebar-nav-item"
              }
            >
              {item.label}
            </NavLink>
          ) : (
            <span key={item.to} className="sidebar-nav-item is-unavailable">
              {item.label}
            </span>
          ),
        )}
      </nav>

      <div className="sidebar-footer">
        <p className="sidebar-footer-name">{user.name}</p>
        <p className="sidebar-footer-role">{user.roleLabel}</p>
        <button type="button" className="text-button sidebar-logout" disabled={loggingOut} onClick={handleLogout}>
          {loggingOut ? "Saindo…" : "Sair"}
        </button>
      </div>
    </aside>
  );
}
