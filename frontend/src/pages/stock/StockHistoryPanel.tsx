import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { getStockItemDetail, type StockItem, type StockItemDetail } from "../../lib/api";
import { formatDateTime } from "../../lib/format";

interface Props {
  item: StockItem;
  close: () => void;
}

const TYPE_LABELS: Record<StockItemDetail["movements"][number]["type"], string> = {
  IN: "Entrada",
  ADJUSTMENT: "Ajuste",
  CONSUMPTION: "Consumo (atendimento)",
};

export function StockHistoryPanel({ item, close }: Props) {
  const [detail, setDetail] = useState<StockItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStockItemDetail(item.id)
      .then(setDetail)
      .catch(() => setError("Não foi possível carregar o histórico."));
  }, [item.id]);

  return (
    <SidePanel eyebrow="Estoque" title={`Histórico — ${item.name}`} close={close}>
      <div className="records-content">
        {error ? <p className="form-error">{error}</p> : null}
        {!detail && !error ? <p className="page-status">Carregando…</p> : null}
        {detail && detail.movements.length === 0 ? (
          <p className="page-status">Nenhuma movimentação registrada ainda.</p>
        ) : null}
        {detail ? (
          <div className="stock-history-list">
            {detail.movements.map((movement) => (
              <div className="stock-history-row" key={movement.id}>
                <div>
                  <p className="row-title">{TYPE_LABELS[movement.type]}</p>
                  {movement.note ? <p className="procedure-description">{movement.note}</p> : null}
                  <p className="section-meta">{formatDateTime(movement.createdAt)}</p>
                </div>
                <span
                  className={
                    Number(movement.quantityDelta) >= 0
                      ? "stock-history-delta is-positive"
                      : "stock-history-delta is-negative"
                  }
                >
                  {Number(movement.quantityDelta) >= 0 ? "+" : ""}
                  {movement.quantityDelta} {detail.unit}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SidePanel>
  );
}
