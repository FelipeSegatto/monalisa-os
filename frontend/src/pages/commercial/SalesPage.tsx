import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";
import { getProcedureCategories, type CurrentUser } from "../../lib/api";
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
    [search, setSearch] = useState(""),
    [categoryId, setCategoryId] = useState(""),
    [status, setStatus] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const invalidRange = Boolean(start && end && start > end);
  const filters = {
    search: search || undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    status: status || undefined,
    start: start || undefined,
    end: end || undefined,
  };
  useEffect(() => {
    let cancelled = false;
    getProcedureCategories()
      .then((rows) => {
        if (!cancelled) setCategories(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setSales(null);
    setError("");
    setCursor(null);
    if (invalidRange) {
      setSales([]);
      return;
    }
    const timer = window.setTimeout(() => {
      getCommercialSales(customerId, undefined, filters)
        .then((r) => {
          if (!cancelled) {
            setSales(r.sales);
            setCursor(r.nextCursor ?? null);
          }
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [customerId, search, categoryId, status, start, end]);
  async function more() {
    if (!cursor) return;
    setLoading(true);
    try {
      const r = await getCommercialSales(customerId, cursor, filters);
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
      <section className="listing-filters" aria-label="Filtros de vendas">
        <label className="field">
          Buscar venda ou cliente
          <input
            className="text-input"
            value={search}
            maxLength={120}
            disabled={loading}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome, oferta ou procedimento"
          />
        </label>
        <label className="field">
          Categoria do procedimento
          <select
            className="select-input"
            value={categoryId}
            disabled={loading}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select
            className="select-input"
            value={status}
            disabled={loading}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos</option>
            {Object.entries(saleStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="listing-period">
          <label className="field">
            Venda a partir de
            <input
              className="text-input"
              type="date"
              value={start}
              max={end || undefined}
              disabled={loading}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="field">
            Até
            <input
              className="text-input"
              type="date"
              value={end}
              min={start || undefined}
              disabled={loading}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="text-button listing-clear"
          disabled={
            loading || !(search || categoryId || status || start || end)
          }
          onClick={() => {
            setSearch("");
            setCategoryId("");
            setStatus("");
            setStart("");
            setEnd("");
          }}
        >
          Limpar filtros
        </button>
      </section>
      {invalidRange && (
        <p className="form-error" role="alert">
          A data inicial deve ser anterior ou igual à final.
        </p>
      )}
      {sales && !invalidRange && (
        <p className="section-meta" role="status">
          {sales.length}{" "}
          {sales.length === 1 ? "venda encontrada" : "vendas encontradas"}
          {cursor ? " · há mais resultados" : ""}
        </p>
      )}
      {!sales && !error && <p>Carregando…</p>}
      {sales?.length === 0 && <p>Nenhuma venda registrada.</p>}
      <div className="commercial-cards">
        {sales?.map((s) => (
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
