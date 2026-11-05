import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { getProcedureCategories, type Procedure } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { publishOffer, type Offer, type OfferInput } from "./api";
export function OfferEditor({
  offer,
  close,
  onSaved,
}: {
  offer: Offer | null;
  close: () => void;
  onSaved: (offer: Offer) => void;
}) {
  const initial = offer?.versions[0];
  const [procedures, setProcedures] = useState<Procedure[]>([]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [form, setForm] = useState<OfferInput>(() => ({
    name: initial?.name ?? "",
    startsOn: new Date().toLocaleDateString("en-CA"),
    endsOn: initial?.endsOn ?? null,
    sessionValidityDays: initial?.sessionValidityDays ?? null,
    price: initial?.price ?? 0,
    terms: initial?.terms ?? null,
    items: initial?.items.map((i) => ({
      procedureId: i.procedureId,
      variationId: i.variationId,
      sessions: i.sessions,
    })) ?? [{ procedureId: 0, variationId: null, sessions: 1 }],
  }));
  useEffect(() => {
    let cancelled = false;
    getProcedureCategories()
      .then((c) => {
        if (!cancelled)
          setProcedures(c.flatMap((c) => c.procedures).filter((p) => p.active));
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  function item(index: number, patch: Partial<OfferInput["items"][number]>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((i, n) => (n === index ? { ...i, ...patch } : i)),
    }));
  }
  const reference = form.items.reduce((n, i) => {
    const p = procedures.find((p) => p.id === i.procedureId),
      v = p?.variations.find((v) => v.id === i.variationId);
    return n + (v?.price ?? p?.price ?? 0) * i.sessions;
  }, 0);
  async function save() {
    setSaving(true);
    setError("");
    try {
      onSaved(await publishOffer(offer?.id ?? null, form));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SidePanel
      eyebrow="Comercial"
      title={offer ? "Publicar nova versão" : "Nova oferta"}
      close={close}
      wide
      footer={
        <>
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Publicando…" : "Publicar oferta"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="section-meta">
            Condições publicadas ficam preservadas. Uma nova versão não altera
            vendas anteriores.
          </p>
          <label className="field">
            Nome da oferta
            <input
              className="text-input"
              maxLength={150}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              Início das vendas
              <input
                className="text-input"
                type="date"
                value={form.startsOn}
                onChange={(e) => setForm({ ...form, startsOn: e.target.value })}
              />
            </label>
            <label className="field">
              Fim das vendas (opcional)
              <input
                className="text-input"
                type="date"
                value={form.endsOn ?? ""}
                onChange={(e) =>
                  setForm({ ...form, endsOn: e.target.value || null })
                }
              />
            </label>
          </div>
          <label className="field">
            Prazo de utilização após a compra, em dias (vazio = sem prazo)
            <input
              className="text-input"
              type="number"
              min="1"
              max="3650"
              value={form.sessionValidityDays ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  sessionValidityDays: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
            />
          </label>
          <div className="section-header">
            <span className="section-label">Procedimentos incluídos</span>
          </div>
          {form.items.map((i, index) => {
            const p = procedures.find((p) => p.id === i.procedureId);
            return (
              <div className="commercial-line" key={index}>
                <div className="field-grid">
                  <label className="field">
                    Procedimento
                    <select
                      className="select-input"
                      value={i.procedureId || ""}
                      onChange={(e) =>
                        item(index, {
                          procedureId: Number(e.target.value),
                          variationId: null,
                        })
                      }
                    >
                      <option value="">Selecione…</option>
                      {procedures.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Área ou opção
                    <select
                      className="select-input"
                      value={i.variationId ?? ""}
                      onChange={(e) =>
                        item(index, {
                          variationId: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">
                        {p?.variations.some((v) => v.active)
                          ? "Selecione…"
                          : "Sem opção específica"}
                      </option>
                      {p?.variations
                        .filter((v) => v.active)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.groupName ? `${v.groupName} · ` : ""}
                            {v.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    Sessões desta área
                    <input
                      className="text-input"
                      type="number"
                      min="1"
                      max="1000"
                      value={i.sessions}
                      onChange={(e) =>
                        item(index, { sessions: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setForm({
                      ...form,
                      items: form.items.filter((_, n) => n !== index),
                    })
                  }
                >
                  Remover item
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setForm({
                ...form,
                items: [
                  ...form.items,
                  { procedureId: 0, variationId: null, sessions: 1 },
                ],
              })
            }
          >
            Adicionar procedimento
          </button>
          <p>Referência atual: {formatPrice(reference)}</p>
          <label className="field">
            Preço da oferta
            <input
              className="text-input"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
          </label>
          <label className="field">
            Condições e observações
            <textarea
              className="text-input"
              rows={4}
              maxLength={2000}
              value={form.terms ?? ""}
              onChange={(e) =>
                setForm({ ...form, terms: e.target.value || null })
              }
            />
          </label>
        </div>
      </div>
    </SidePanel>
  );
}
