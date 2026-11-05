import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { type CurrentUser } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import {
  getOffers,
  getOffer,
  setOfferState,
  offerStatusLabels,
  type Offer,
} from "./api";
import { CommercialNav } from "./CommercialNav";
import { OfferEditor } from "./OfferEditor";
export function OffersPage() {
  const { id } = useParams(),
    navigate = useNavigate(),
    user = useOutletContext<CurrentUser>();
  const [offers, setOffers] = useState<Offer[]>([]),
    [offer, setOffer] = useState<Offer | null>(null),
    [editing, setEditing] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("");
  function reload() {
    setLoading(true);
    setError("");
    if (id)
      getOffer(Number(id))
        .then(setOffer)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    else
      getOffers()
        .then((r) => setOffers(r.offers))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
  }
  useEffect(reload, [id]);
  async function toggle() {
    if (!offer) return;
    const reason = window.prompt(
      offer.active ? "Motivo da pausa" : "Motivo da retomada",
    );
    if (!reason) return;
    try {
      setOffer(await setOfferState(offer.id, !offer.active, reason));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar.");
    }
  }
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Comercial</p>
          <h1 className="page-header-title">
            {id ? (offer?.name ?? "Oferta") : "Ofertas"}
          </h1>
        </div>
        {user.role === "ADMIN" && (
          <button
            type="button"
            className="primary-button"
            onClick={() => setEditing(true)}
          >
            {id ? "Nova versão" : "Nova oferta"}
          </button>
        )}
      </header>
      <CommercialNav />
      {id && (
        <Link className="back-link" to="/comercial/ofertas">
          ← Todas as ofertas
        </Link>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading && <p>Carregando…</p>}
      {!id && !loading && (
        <>
          <div className="field-grid">
            <label className="field">
              Buscar oferta
              <input
                className="text-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="field">
              Situação
              <select
                className="select-input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todas</option>
                {Object.entries(offerStatusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="commercial-cards">
            {offers
              .filter(
                (o) =>
                  o.name
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase()) &&
                  (!status || status === o.status),
              )
              .map((o) => {
                const v =
                  o.versions.find((v) => v.id === o.effectiveVersionId) ??
                  o.versions[0];
                return (
                  <article className="commercial-card" key={o.id}>
                    <h2>
                      <Link to={`/comercial/ofertas/${o.id}`}>{o.name}</Link>
                    </h2>
                    <p>
                      {offerStatusLabels[o.status]} ·{" "}
                      {v ? formatPrice(v.price) : "Sem versão"}
                    </p>
                    <p className="section-meta">
                      {v?.startsOn} até {v?.endsOn ?? "sem data final"}
                    </p>
                    <p>
                      {v?.items
                        .map(
                          (i) =>
                            `${i.procedureName}${i.variationName ? " · " + i.variationName : ""} (${i.sessions} sessões)`,
                        )
                        .join(" + ")}
                    </p>
                  </article>
                );
              })}
          </div>
          {offers.length === 0 && <p>Nenhuma oferta cadastrada.</p>}
        </>
      )}
      {id && offer && !loading && (
        <>
          <div className="commercial-actions">
            <span>{offerStatusLabels[offer.status]}</span>
            {user.role === "ADMIN" && (
              <button
                type="button"
                className="secondary-button"
                onClick={toggle}
              >
                {offer.active ? "Pausar oferta" : "Retomar oferta"}
              </button>
            )}
            <Link to="/comercial/vendas">Registrar uma venda →</Link>
          </div>
          <p className="section-meta">
            O fim da comercialização não encerra as sessões já contratadas.
          </p>
          {offer.versions.map((v) => (
            <section className="commercial-card commercial-line" key={v.id}>
              <h2>
                Versão {v.version} · {v.name}
              </h2>
              <p>
                {v.id === offer.effectiveVersionId
                  ? "Disponível para novas vendas · "
                  : ""}
                {formatPrice(v.price)} · Referência preservada:{" "}
                {formatPrice(v.referenceAmount)}
              </p>
              <p>
                Comercialização: {v.startsOn} até {v.endsOn ?? "sem data final"}
                . Utilização:{" "}
                {v.sessionValidityDays
                  ? `${v.sessionValidityDays} dias após a compra`
                  : "sem prazo definido"}
                .
              </p>
              <ul>
                {v.items.map((i) => (
                  <li key={i.id}>
                    <Link to={`/procedimentos/${i.procedureId}`}>
                      {i.procedureName}
                    </Link>
                    {i.variationName ? " · " + i.variationName : ""}:{" "}
                    {i.sessions} sessões · Referência unitária{" "}
                    {formatPrice(i.referenceUnitPrice)}
                  </li>
                ))}
              </ul>
              {v.terms && <p className="commercial-terms">{v.terms}</p>}
              <p className="section-meta">
                Publicada em {new Date(v.createdAt).toLocaleString("pt-BR")} ·
                Responsável #{v.actorId}
              </p>
            </section>
          ))}
          <div className="section-header">
            <span className="section-label">Histórico da oferta</span>
          </div>
          <ul className="commercial-history">
            {offer.events.map((e) => (
              <li key={e.id}>
                {e.type === "VERSION_PUBLISHED"
                  ? "Versão publicada"
                  : e.type === "PAUSED"
                    ? "Oferta pausada"
                    : "Oferta retomada"}{" "}
                · {new Date(e.createdAt).toLocaleString("pt-BR")} · Responsável
                #{e.actorId}
                {e.reason ? " · " + e.reason : ""}
              </li>
            ))}
          </ul>
        </>
      )}
      {editing && (
        <OfferEditor
          offer={id ? offer : null}
          close={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            setOffer(saved);
            if (String(saved.id) !== id)
              navigate(`/comercial/ofertas/${saved.id}`);
            else reload();
          }}
        />
      )}
    </div>
  );
}
