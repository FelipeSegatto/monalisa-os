import { useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { registerStockMovement, type StockItem } from "../../lib/api";

interface Props {
  item: StockItem;
  type: "IN" | "ADJUSTMENT";
  close: () => void;
  onSaved: () => void;
}

export function StockMovementPanel({ item, type, close, onSaved }: Props) {
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEntrada = type === "IN";

  async function handleSave() {
    const value = Number(quantity);
    if (!quantity.trim() || Number.isNaN(value) || value === 0) {
      setError("Informe uma quantidade válida.");
      return;
    }
    if (isEntrada && value <= 0) {
      setError("Quantidade de entrada deve ser positiva.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await registerStockMovement(item.id, { type, quantity: value, note: note.trim() || null });
      setSaving(false);
      onSaved();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Não foi possível registrar o movimento.");
    }
  }

  return (
    <SidePanel
      eyebrow="Estoque"
      title={isEntrada ? `Entrada — ${item.name}` : `Ajuste — ${item.name}`}
      close={close}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button primary-button-link"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? "Salvando…" : "Confirmar"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error ? <p className="form-error">{error}</p> : null}
          <p className="section-meta">
            Estoque atual: {item.quantity} {item.unit}
          </p>
          <label className="field">
            {isEntrada ? "Quantidade recebida" : "Ajuste (positivo soma, negativo subtrai)"}
            <input
              className="text-input"
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={isEntrada ? "Ex.: 10" : "Ex.: -2 ou 5"}
            />
          </label>
          <label className="field">
            Nota (opcional)
            <input
              className="text-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isEntrada ? "Ex.: compra do fornecedor X" : "Ex.: contagem física"}
            />
          </label>
        </div>
      </div>
    </SidePanel>
  );
}
