import "./commercial.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEntitlements, type Entitlement } from "./api";
const labels = {
  ACTIVE: "Disponível",
  EXPIRED: "Prazo encerrado",
  CANCELLED: "Venda cancelada",
  AWAITING_PAYMENT: "Aguardando quitação",
};
export function EntitlementsSection({
  customerId,
  reloadToken = 0,
}: {
  customerId: number;
  reloadToken?: number;
}) {
  const [data, setData] = useState<Entitlement[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setData(null);
    getEntitlements(customerId)
      .then((r) => {
        if (!cancelled) setData(r.entitlements);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, reloadToken]);
  return (
    <section>
      <div className="section-header">
        <span className="section-label">Pacotes e sessões</span>
        <Link to={`/comercial/vendas?customerId=${customerId}`}>
          Ver vendas →
        </Link>
      </div>
      {error && <p className="form-error">{error}</p>}
      {!data && !error && <p>Carregando sessões…</p>}
      {data?.length === 0 && (
        <p className="section-meta">
          Nenhum saldo de sessões registrado no novo comercial.
        </p>
      )}
      <div className="commercial-cards">
        {data?.map((e) => (
          <article className="commercial-card" key={e.id}>
            <h3>{e.description}</h3>
            <p>
              {e.available} disponíveis · {e.reserved} reservadas · {e.used}{" "}
              utilizadas de {e.quantity}
            </p>
            <p className="section-meta">
              {labels[e.status]} ·{" "}
              {e.expiresAt
                ? `Até ${new Date(e.expiresAt).toLocaleString("pt-BR")}`
                : "Sem prazo de utilização"}
            </p>
            <Link to={`/comercial/vendas/${e.saleId}`}>
              Venda #{e.saleId} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
