import { NavLink } from "react-router-dom";
import "./commercial.css";
export function CommercialNav() {
  return (
    <nav className="commercial-nav" aria-label="Comercial">
      <NavLink to="/comercial/ofertas">Ofertas</NavLink>
      <NavLink to="/comercial/vendas">Vendas e sessões</NavLink>
    </nav>
  );
}
