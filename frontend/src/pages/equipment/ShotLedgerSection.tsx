import { useEffect, useState } from "react";
import {
  getShotCounters,
  getShotEntries,
  postShotEntry,
  reverseShotEntry,
  correctShotEntry,
  type ShotCounters,
  type ShotEntry,
} from "../../lib/api";
const labels: Record<string, string> = {
  OPENING: "Contador inicial",
  CONSUMPTION: "Consumo",
  ADJUSTMENT: "Ajuste",
  REVERSAL: "Estorno",
};
export function ShotLedgerSection({
  equipmentId,
  canManage,
}: {
  equipmentId: number;
  canManage: boolean;
}) {
  const [counters, setCounters] = useState<ShotCounters | null>(null),
    [entries, setEntries] = useState<ShotEntry[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [component, setComponent] = useState(""),
    [quantity, setQuantity] = useState(""),
    [reason, setReason] = useState(""),
    [kind, setKind] = useState<"OPENING" | "ADJUSTMENT">("OPENING"),
    [key, setKey] = useState(() => crypto.randomUUID());
  function reload() {
    return Promise.all([
      getShotCounters(equipmentId),
      getShotEntries(equipmentId),
    ]).then(([c, e]) => {
      setCounters(c);
      setEntries(e);
    });
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([getShotCounters(equipmentId), getShotEntries(equipmentId)])
      .then(([c, e]) => {
        if (!cancelled) {
          setCounters(c);
          setEntries(e);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [equipmentId]);
  async function post() {
    if (
      !quantity.trim() ||
      !Number.isInteger(Number(quantity)) ||
      reason.trim().length < 3
    ) {
      setError("Informe disparos inteiros e um motivo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await postShotEntry(equipmentId, {
        componentId: component ? Number(component) : null,
        type: kind,
        quantityDelta: Number(quantity),
        reason: reason.trim(),
        requestKey: key,
      });
      setKey(crypto.randomUUID());
      setQuantity("");
      setReason("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao registrar.");
    } finally {
      setBusy(false);
    }
  }
  async function correct(entry: ShotEntry) {
    const answer = window.prompt(
      "Quantidade correta de disparos desta execução",
      String(entry.quantityDelta),
    );
    if (answer === null) return;
    const reason = window.prompt("Motivo da correção");
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await correctShotEntry(entry.id, {
        quantity: Number(answer),
        reason,
        requestKey: crypto.randomUUID(),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao corrigir.");
    } finally {
      setBusy(false);
    }
  }
  async function reverse(entry: ShotEntry) {
    const reason = window.prompt("Motivo do estorno");
    if (!reason) return;
    setBusy(true);
    setError("");
    try {
      await reverseShotEntry(entry.id, {
        reason,
        requestKey: crypto.randomUUID(),
      });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao estornar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="section-header">
        <span className="section-label">Disparos e cartuchos</span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {counters && (
        <>
          {counters.tracking === "NONE" ? (
            <p>Este aparelho não controla disparos.</p>
          ) : (
            <>
              <p className="section-meta">
                Registre o contador inicial real antes do primeiro uso no
                sistema. Zero deve ser informado explicitamente para um contador
                novo.
              </p>
              {counters.tracking === "EQUIPMENT" && (
                <p>
                  Contador: {counters.equipmentCounter ?? "Não inicializado"}
                </p>
              )}
              {counters.components.map((c) => (
                <p key={c.id}>
                  {c.name}: {c.consumed ?? "não inicializado"} · Restantes:{" "}
                  {c.remaining ?? "não informado"} · {c.status}
                </p>
              ))}
              {canManage && (
                <div className="record-form">
                  <label className="field">
                    Contador
                    <select
                      className="select-input"
                      value={component}
                      onChange={(e) => setComponent(e.target.value)}
                    >
                      <option value="">
                        {counters.tracking === "COMPONENT"
                          ? "Selecione o cartucho…"
                          : "Equipamento"}
                      </option>
                      {counters.tracking === "COMPONENT" &&
                        counters.components.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    Registro
                    <select
                      className="select-input"
                      value={kind}
                      onChange={(e) => setKind(e.target.value as typeof kind)}
                    >
                      <option value="OPENING">Contador inicial</option>
                      <option value="ADJUSTMENT">Ajuste auditável</option>
                    </select>
                  </label>
                  <label className="field">
                    {kind === "OPENING"
                      ? "Disparos já consumidos"
                      : "Diferença de disparos (positiva ou negativa)"}
                    <input
                      className="text-input"
                      type="number"
                      step="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Motivo
                    <input
                      className="text-input"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busy}
                    onClick={post}
                  >
                    Registrar
                  </button>
                </div>
              )}
            </>
          )}
          <div className="section-header">
            <span className="section-label">Histórico de disparos</span>
          </div>
          {entries.map((e) => (
            <div key={e.id}>
              <p>
                #{e.id} · {new Date(e.createdAt).toLocaleString("pt-BR")} ·{" "}
                {labels[e.type] ?? e.type} · {e.quantityDelta > 0 ? "+" : ""}
                {e.quantityDelta} · Responsável #{e.actorId}
                {e.reason ? ` · ${e.reason}` : ""}
              </p>
              {canManage &&
                e.type !== "OPENING" &&
                e.type !== "REVERSAL" &&
                !entries.some((r) => r.reversesId === e.id) && (
                  <button
                    className="text-button"
                    type="button"
                    disabled={busy}
                    onClick={() => reverse(e)}
                  >
                    Estornar com motivo
                  </button>
                )}
              {canManage &&
                e.type === "CONSUMPTION" &&
                !entries.some((r) => r.reversesId === e.id) && (
                  <button
                    className="text-button"
                    type="button"
                    disabled={busy}
                    onClick={() => correct(e)}
                  >
                    Corrigir quantidade
                  </button>
                )}
            </div>
          ))}
          {entries.length >= 100 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                getShotEntries(equipmentId, entries.at(-1)!.id)
                  .then((more) => setEntries([...entries, ...more]))
                  .catch((e) => setError(e.message));
              }}
            >
              Carregar anteriores
            </button>
          )}
        </>
      )}
    </section>
  );
}
