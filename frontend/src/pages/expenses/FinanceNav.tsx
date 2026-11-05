import { NavLink } from "react-router-dom";
import "./expenses.css";
export function FinanceNav() {
  return (
    <nav className="expenses-nav" aria-label="Financeiro">
      <NavLink to="/financeiro" end>
        Visão geral
      </NavLink>
      <NavLink to="/financeiro/despesas">Despesas</NavLink>
    </nav>
  );
}
