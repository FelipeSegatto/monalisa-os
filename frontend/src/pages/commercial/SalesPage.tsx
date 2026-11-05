import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";
import { type CurrentUser } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import {
  getCommercialSales,
  saleStatusLabels,
  type CommercialSale,
} from "./api";
import { SaleComposer } from "./SaleComposer";
import { CommercialNav } from "./CommercialNav";
export function SalesPage() {
  const user = useOutletContext<CurrentUser>(),
    navigate = useNavigate(),
    [params] = useSearchParams(),
    customerId = Number(params.get("customerId")) || undefined;
  const [sales, setSales] = useState<CommercialSale[] | null>(null),
    [cursor, setCursor] = useState<number | null>(null),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false),
    [loading, setLoading] = useState(false),
    [search, setSearch] = useState("");
  useEffect(() => {
    let cancelled = false;
    setSales(null);
    getCommercialSales(customerId)
      .then((r) => {
        if (!cancelled) {
          setSales(r.sales);
          setCursor(r.nextCursor ?? null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);
  async function more() {
    if (!cursor) return;
    setLoading(true);
    try {
      const r = await getCommercialSales(customerId, cursor);
      setSales([...(sales ?? []), ...r.sales]);
      setCursor(r.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Comercial</p>
          <h1 className="page-header-title">Vendas e sessões</h1>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setCreating(true)}
        >
          Nova venda
        </button>
      </header>
      <CommercialNav />
      {customerId && (
        <p>
          Vendas do cliente #{customerId} ·{" "}
          <Link to="/comercial/vendas">Todos os clientes</Link>
        </p>
      )}
      {error && <p className="form-error">{error}</p>}
      <label className="field">
        Buscar nas vendas carregadas
        <input
          className="text-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {!sales && !error && <p>Carregando…</p>}
      {sales?.length === 0 && <p>Nenhuma venda registrada.</p>}
      <div className="commercial-cards">
        {sales
          ?.filter((s) =>
            `${s.id} ${s.customerName} ${s.offerPurchases.map((p) => p.offerName).join(" ")}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((s) => (
            <article className="commercial-card" key={s.id}>
              <h2>
                <Link to={`/comercial/vendas/${s.id}`}>
                  Venda #{s.id} · {s.customerName}
                </Link>
              </h2>
              <p>
                {saleStatusLabels[s.status]} · {formatPrice(s.total)}
              </p>
              <p className="section-meta">
                {new Date(s.createdAt).toLocaleDateString("pt-BR")} · Recebido{" "}
                {formatPrice(s.received)} · Saldo {formatPrice(s.balance)}
              </p>
              <p>
                {s.offerPurchases.length
                  ? s.offerPurchases.map((p) => p.offerName).join(" + ")
                  : s.items.map((i) => i.description).join(" + ")}
              </p>
              {s.commercialModel === "LEGACY" && (
                <p className="section-meta">
                  Registro anterior ao controle de sessões
                </p>
              )}
            </article>
          ))}
      </div>
      {cursor && (
        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={more}
        >
          Carregar vendas anteriores
        </button>
      )}
      {creating && (
        <SaleComposer
          user={user}
          customerDefault={customerId}
          close={() => setCreating(false)}
          onSaved={(s) => {
            setCreating(false);
            navigate(`/comercial/vendas/${s.id}`);
          }}
        />
      )}
    </div>
  );
}
