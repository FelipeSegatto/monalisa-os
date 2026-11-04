import { useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { createStockItem } from "../../lib/api";

interface Props {
  close: () => void;
  onCreated: () => void;
}

export function NewStockItemPanel({ close, onCreated }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("0");
  const [minQuantity, setMinQuantity] = useState("0");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !unit.trim()) {
      setError("Nome e unidade são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createStockItem({
        name: name.trim(),
        unit: unit.trim(),
        initialQuantity: Number(initialQuantity) || 0,
        minQuantity: Number(minQuantity) || 0,
      });
      setSaving(false);
      onCreated();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Não foi possível criar o item.");
    }
  }

  return (
    <SidePanel
      eyebrow="Estoque"
      title="Novo item"
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
            {saving ? "Criando…" : "Criar item"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error ? <p className="form-error">{error}</p> : null}
          <label className="field">
            Nome
            <input
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Ácido hialurônico"
            />
          </label>
          <label className="field">
            Unidade
            <input
              className="text-input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Ex.: ml, un, g"
            />
          </label>
          <div className="field-grid">
            <label className="field">
              Quantidade inicial
              <input
                className="text-input"
                type="number"
                step="0.01"
                min="0"
                value={initialQuantity}
                onChange={(e) => setInitialQuantity(e.target.value)}
              />
            </label>
            <label className="field">
              Estoque mínimo
              <input
                className="text-input"
                type="number"
                step="0.01"
                min="0"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
