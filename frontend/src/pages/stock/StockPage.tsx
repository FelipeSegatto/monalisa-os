import { useEffect, useState } from "react";
import { getStockItems, type StockItem } from "../../lib/api";
import { NewStockItemPanel } from "./NewStockItemPanel";
import { StockMovementPanel } from "./StockMovementPanel";
import { StockHistoryPanel } from "./StockHistoryPanel";
import "./StockPage.css";

function formatQuantity(value: string): string {
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function StockPage() {
  const [items, setItems] = useState<StockItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewItem, setShowNewItem] = useState(false);
  const [movementTarget, setMovementTarget] = useState<{
    item: StockItem;
    type: "IN" | "ADJUSTMENT" | "CONSUMPTION";
  } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<StockItem | null>(null);

  function reload() {
    getStockItems()
      .then(setItems)
      .catch(() => setError("Não foi possível carregar o estoque."));
  }

  useEffect(reload, []);

  const lowCount = items?.filter((item) => item.isLow).length ?? 0;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Operação</p>
          <h1 className="page-header-title">Estoque</h1>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="primary-button primary-button-link"
            onClick={() => setShowNewItem(true)}
          >
            Novo item
          </button>
        </div>
      </header>

      {error ? <p className="page-status">{error}</p> : null}

      {items ? (
        <section>
          <div className="section-header">
            <span className="section-label">Itens</span>
            <span className="section-meta">
              {items.length} itens{lowCount > 0 ? ` · ${lowCount} com estoque baixo` : ""}
            </span>
          </div>

          {items.length === 0 ? (
            <p className="procedure-empty">Nenhum item cadastrado ainda.</p>
          ) : (
            <div className="stock-list">
              {items.map((item) => (
                <div className="stock-row" key={item.id}>
                  <div>
                    <p className="row-title">{item.name}</p>
                    {!item.active ? <p className="procedure-description">Inativo</p> : null}
                  </div>
                  <span className="stock-quantity">
                    {formatQuantity(item.quantity)} {item.unit}
                  </span>
                  <span className="section-meta">
                    mín. {formatQuantity(item.minQuantity)} {item.unit}
                  </span>
                  <span className={item.isLow ? "active-badge is-low" : "active-badge is-active"}>
                    {item.isLow ? "Estoque baixo" : "OK"}
                  </span>
                  <div className="stock-actions">
                    <button type="button" className="text-button" onClick={()=>setMovementTarget({item,type:"CONSUMPTION"})}>Registrar embalagem consumida</button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setMovementTarget({ item, type: "IN" })}
                    >
                      Entrada
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setMovementTarget({ item, type: "ADJUSTMENT" })}
                    >
                      Ajustar
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => setHistoryTarget(item)}
                    >
                      Histórico
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : !error ? (
        <p className="page-status">Carregando…</p>
      ) : null}

      {showNewItem ? (
        <NewStockItemPanel
          close={() => setShowNewItem(false)}
          onCreated={() => {
            setShowNewItem(false);
            reload();
          }}
        />
      ) : null}

      {movementTarget ? (
        <StockMovementPanel
          item={movementTarget.item}
          type={movementTarget.type}
          close={() => setMovementTarget(null)}
          onSaved={() => {
            setMovementTarget(null);
            reload();
          }}
        />
      ) : null}

      {historyTarget ? (
        <StockHistoryPanel item={historyTarget} close={() => setHistoryTarget(null)} onChanged={reload} />
      ) : null}
    </div>
  );
}
