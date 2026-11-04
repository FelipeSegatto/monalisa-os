import { Link } from "react-router-dom";
import { useProfessionals } from "./hooks/useProfessionals";
import "./ProfessionalsPage.css";

export function ProfessionalsPage() {
  const { data, loading, error } = useProfessionals();

  if (loading) {
    return <p className="page-status">Carregando…</p>;
  }

  if (error || !data) {
    return <p className="page-status">Não foi possível carregar os profissionais.</p>;
  }

  const activeCount = data.filter((professional) => professional.active).length;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Equipe</p>
          <h1 className="page-header-title">Profissionais</h1>
        </div>
        <Link to="/profissionais/novo" className="primary-button primary-button-link">
          Novo profissional
        </Link>
      </header>

      <section>
        <div className="section-header">
          <span className="section-label">Todos</span>
          <span className="section-meta">
            {activeCount} {activeCount === 1 ? "ativo" : "ativos"} de {data.length}
          </span>
        </div>

        <div className="professional-list">
          {data.map((professional) => (
            <div className="professional-row" key={professional.id}>
              <div className="professional-initials" style={{ borderColor: professional.color }}>
                {professional.name
                  .split(" ")
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div>
                <Link to={`/profissionais/${professional.id}`} className="row-title">
                  {professional.name}
                </Link>
                <span className={professional.active ? "active-badge is-active" : "active-badge"}>
                  {professional.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="professional-stat">
                <span className="section-meta">Próximos atendimentos</span>
                <b>{professional.upcomingAppointments}</b>
              </div>
              <div className="professional-stat">
                <span className="section-meta">Atendimentos no mês</span>
                <b>{professional.appointmentsThisMonth}</b>
              </div>
              <Link to="/agenda" className="secondary-button professional-agenda-link">
                Ver agenda
              </Link>
              <Link to={`/profissionais/${professional.id}`} className="section-link">
                Editar
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
