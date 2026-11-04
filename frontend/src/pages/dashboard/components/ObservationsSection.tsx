import type { DashboardOverview } from "../../../lib/api";
import "./ObservationsSection.css";

interface Props {
  overview: DashboardOverview;
}

export function ObservationsSection({ overview }: Props) {
  const { referralPercentage } = overview.observations;

  // As outras duas observações do design de referencia (receita por
  // injetaveis, clientes proximos do retorno) dependem de vendas/pagamentos
  // e de regras de retorno que ainda nao existem (ver docs/DECISIONS.md) -
  // nao sao exibidas com dado fictício.
  if (referralPercentage === null) {
    return null;
  }

  return (
    <section className="observations">
      <div className="observations-label-col">
        <p className="section-label">Observações</p>
        <p className="observations-meta">Calculadas a partir dos registros do período</p>
      </div>
      <div className="observations-text-col">
        <p className="observations-sentence">
          Indicações representam {referralPercentage}% dos novos clientes deste mês.
        </p>
      </div>
    </section>
  );
}
