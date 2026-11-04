import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useProcedureCategories } from "./hooks/useProcedureCategories";
import { CatalogPreview } from "./CatalogPreview";
import { formatPrice } from "../../lib/format";
import type { CurrentUser } from "../../lib/api";
import "./ProceduresPage.css";

function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

export function ProceduresPage() {
  const user = useOutletContext<CurrentUser | null>();
  const canManage = user?.role !== "FUNCIONARIO";
  const { data, loading, error } = useProcedureCategories();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [showCatalog, setShowCatalog] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();
    return data
      .filter((category) => categoryId === "all" || category.id === categoryId)
      .map((category) => ({
        ...category,
        procedures: category.procedures.filter((procedure) =>
          query ? procedure.name.toLowerCase().includes(query) : true,
        ),
      }))
      .filter((category) => category.procedures.length > 0 || query === "");
  }, [data, search, categoryId]);

  if (loading) {
    return <p className="page-status">Carregando…</p>;
  }

  if (error || !data) {
    return <p className="page-status">Não foi possível carregar os procedimentos.</p>;
  }

  if (showCatalog) {
    return <CatalogPreview categories={data} close={() => setShowCatalog(false)} />;
  }

  const totalProcedures = data.reduce((sum, category) => sum + category.procedures.length, 0);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Serviços e catálogo</p>
          <h1 className="page-header-title">Procedimentos</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="secondary-button" onClick={() => setShowCatalog(true)}>
            Prévia do catálogo
          </button>
          {canManage ? (
            <Link to="/procedimentos/novo" className="primary-button primary-button-link">
              Novo procedimento
            </Link>
          ) : null}
        </div>
      </header>

      <section>
        <div className="toolbar">
          <input
            className="text-input"
            aria-label="Buscar procedimentos"
            placeholder="Buscar procedimento"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="select-input"
            aria-label="Filtrar categoria"
            value={categoryId}
            onChange={(event) =>
              setCategoryId(event.target.value === "all" ? "all" : Number(event.target.value))
            }
          >
            <option value="all">Todas as categorias</option>
            {data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="section-header">
          <span className="section-label">Categorias</span>
          <span className="section-meta">
            {data.length} categorias · {totalProcedures} procedimentos
          </span>
        </div>

        <div className="procedure-categories">
          {filteredCategories.map((category) => (
            <div className="procedure-category" key={category.id}>
              <div className="procedure-category-header">
                <h2 className="procedure-category-title">{category.name}</h2>
                <span className="section-meta">
                  {category.procedures.length}{" "}
                  {category.procedures.length === 1 ? "procedimento" : "procedimentos"}
                </span>
              </div>

              {category.procedures.length === 0 ? (
                <p className="procedure-empty">Nenhum procedimento cadastrado nesta categoria.</p>
              ) : (
                <div className="procedure-list">
                  {category.procedures.map((procedure) => (
                    <div className="procedure-row" key={procedure.id}>
                      <div>
                        <Link to={`/procedimentos/${procedure.id}`} className="row-title">
                          {procedure.name}
                        </Link>
                        {procedure.description ? (
                          <p className="procedure-description">{procedure.description}</p>
                        ) : null}
                      </div>
                      <span className="procedure-duration">
                        {formatDuration(procedure.durationMinutes)}
                      </span>
                      <span className="procedure-price">
                        {procedure.hasVariations ? "A partir de " : ""}
                        {formatPrice(procedure.displayPrice)}
                      </span>
                      <span className={procedure.active ? "active-badge is-active" : "active-badge"}>
                        {procedure.active ? "Ativo" : "Inativo"}
                      </span>
                      <Link to={`/procedimentos/${procedure.id}`} className="section-link">
                        {canManage ? "Editar →" : "Ver →"}
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
