import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOffers, offerStatusLabels, type Offer } from "./api";
export function ProcedureOffersSection({
  procedureId,
}: {
  procedureId: number;
}) {
  const [offers, setOffers] = useState<Offer[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    getOffers(procedureId)
      .then((r) => {
        if (!cancelled) setOffers(r.offers);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [procedureId]);
  return (
    <section>
      <div className="section-header">
        <span className="section-label">Ofertas relacionadas</span>
        <Link to="/comercial/ofertas">Gerenciar ofertas →</Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      {offers?.length === 0 && (
        <p className="section-meta">Nenhuma oferta inclui este procedimento.</p>
      )}
      {offers?.map((o) => (
        <p key={o.id}>
          <Link to={`/comercial/ofertas/${o.id}`}>{o.name}</Link> ·{" "}
          {offerStatusLabels[o.status]}
        </p>
      ))}
    </section>
  );
}
