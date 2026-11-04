import { Link } from "react-router-dom";
import heroImage from "../../assets/hero.jpeg";
import type { ProcedureCategory } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import "./CatalogPreview.css";

interface Props {
  categories: ProcedureCategory[];
  close: () => void;
}

export function CatalogPreview({ categories, close }: Props) {
  const featured = categories
    .flatMap((category) =>
      category.procedures
        .filter((procedure) => procedure.active)
        .map((procedure) => ({ procedure, categoryName: category.name })),
    )
    .slice(0, 6);

  return (
    <div className="catalog">
      <div className="catalog-top">
        <div>
          <p className="page-header-eyebrow">Prévia comercial</p>
          <h1 className="page-header-title catalog-title">Catálogo de procedimentos</h1>
        </div>
        <button type="button" className="secondary-button" onClick={close}>
          Voltar à gestão
        </button>
      </div>

      <div className="catalog-hero">
        <img src={heroImage} alt="Composição editorial da clínica" />
        <div>
          <p className="page-header-eyebrow">Cuidados pensados para você</p>
          <h2 className="catalog-hero-title">
            Precisão, naturalidade e atenção em cada escolha.
          </h2>
          <p className="catalog-hero-copy">
            Conheça os procedimentos disponíveis e converse com nossa equipe para encontrar o
            cuidado adequado para você.
          </p>
        </div>
      </div>

      <div className="catalog-category">
        <p className="page-header-eyebrow">Procedimentos</p>
        <h2 className="catalog-category-title">Escolhas organizadas com clareza</h2>
      </div>

      <div className="catalog-grid">
        {featured.map(({ procedure, categoryName }, index) => (
          <article key={procedure.id} className={index === 0 ? "featured" : ""}>
            <div className="catalog-art">
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div>
              <p className="page-header-eyebrow">{categoryName}</p>
              <h3 className="catalog-item-title">{procedure.name}</h3>
              {procedure.description ? <p>{procedure.description}</p> : null}
              <b className="catalog-item-price">
                {procedure.hasVariations ? "A partir de " : ""}
                {formatPrice(procedure.displayPrice)}
              </b>
              {procedure.hasVariations && (
                <div className="catalog-prices">
                  {procedure.variations
                    .filter((variation) => variation.active)
                    .slice(0, 6)
                    .map((variation) => (
                      <div key={variation.id}>
                        <span>
                          {variation.name}
                          {variation.reference ? ` · ${variation.reference}` : ""}
                        </span>
                        <b>{formatPrice(variation.price)}</b>
                      </div>
                    ))}
                </div>
              )}
              <div className="catalog-actions">
                <button type="button" className="primary-button" aria-disabled="true">
                  Agendar
                </button>
                <Link to={`/procedimentos/${procedure.id}`} className="section-link">
                  Ver detalhes →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
