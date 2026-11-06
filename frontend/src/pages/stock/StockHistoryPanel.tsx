import { useOutletContext } from "react-router-dom";
import { reverseStockMovement, type CurrentUser } from "../../lib/api";
import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import {
  getStockItemDetail,
  type StockItem,
  type StockItemDetail,
} from "../../lib/api";
import { formatDateOnly, formatDateTime } from "../../lib/format";

interface Props {
  item: StockItem;
  close: () => void;
  onChanged?: () => void;
}

const TYPE_LABELS: Record<
  StockItemDetail["movements"][number]["type"],
  string
> = {
  IN: "Entrada",
  ADJUSTMENT: "Ajuste",
  CONSUMPTION: "Consumo de estoque",
};

export function StockHistoryPanel({ item, close, onChanged }: Props) {
  const user = useOutletContext<CurrentUser | null>();
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<StockItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStockItemDetail(item.id)
      .then(setDetail)
      .catch(() => setError("Não foi possível carregar o histórico."));
  }, [item.id]);

  async function reverse(id: number) {
    const note = window.prompt("Motivo do estorno");
    if (!note) return;
    setBusy(true);
    setError(null);
    try {
      await reverseStockMovement(id, { note, requestKey: crypto.randomUUID() });
      setDetail(await getStockItemDetail(item.id));
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível estornar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SidePanel
      eyebrow="Estoque"
      title={`Histórico — ${item.name}`}
      close={close}
    >
      <div className="records-content">
        <p className="section-meta">
          As validades pertencem às entradas. Como as baixas não identificam o
          lote, confira as embalagens disponíveis ao receber um aviso de
          validade.
        </p>
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
                  {movement.note ? (
                    <p className="procedure-description">{movement.note}</p>
                  ) : null}
                  <p className="section-meta">
                    {formatDateTime(movement.createdAt)} ·{" "}
                    {movement.actorId
                      ? `Responsável #${movement.actorId}`
                      : "Autoria não registrada no histórico anterior"}
                  </p>
                  {movement.expiresAt ? (
                    <p className="section-meta">
                      Validade: {formatDateOnly(movement.expiresAt)}
                    </p>
                  ) : null}
                  {movement.reversesId && (
                    <p className="section-meta">
                      Estorno do movimento #{movement.reversesId}
                    </p>
                  )}
                  {user?.role === "ADMIN" &&
                    !movement.reversesId &&
                    !detail.movements.some(
                      (m) => m.reversesId === movement.id,
                    ) && (
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() => reverse(movement.id)}
                      >
                        Estornar com motivo
                      </button>
                    )}
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
