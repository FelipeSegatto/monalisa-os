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
const number = (value: number) => new Intl.NumberFormat("pt-BR").format(value);
const timestamp = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
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
    [hasMore, setHasMore] = useState(false),
    [loadingMore, setLoadingMore] = useState(false),
    [key, setKey] = useState(() => crypto.randomUUID());
  function reload() {
    return Promise.all([
      getShotCounters(equipmentId),
      getShotEntries(equipmentId),
    ]).then(([c, e]) => {
      setCounters(c);
      setEntries(e);
      setHasMore(e.length === 100);
    });
  }
  useEffect(() => {
    let cancelled = false;
    Promise.all([getShotCounters(equipmentId), getShotEntries(equipmentId)])
      .then(([c, e]) => {
        if (!cancelled) {
          setCounters(c);
          setEntries(e);
          setHasMore(e.length === 100);
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
  async function loadMore() {
    if (!entries.length || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const more = await getShotEntries(equipmentId, entries.at(-1)!.id);
      setEntries((current) => [
        ...current,
        ...more.filter(
          (entry) => !current.some((existing) => existing.id === entry.id),
        ),
      ]);
      setHasMore(more.length === 100);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar o histórico.",
      );
    } finally {
      setLoadingMore(false);
    }
  }
  return (
    <section className="shot-ledger">
      <div className="section-header">
        <span className="section-label">Disparos e cartuchos</span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!counters && !error && (
        <p className="section-meta">Carregando contadores e histórico…</p>
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
                  Contador:{" "}
                  {counters.equipmentCounter === null
                    ? "Não inicializado"
                    : number(counters.equipmentCounter)}
                </p>
              )}
              <div className="shot-counter-grid">
                {counters.components.map((c) => (
                  <article className="shot-counter" key={c.id}>
                    <h3>{c.name}</h3>
                    <dl>
                      <div>
                        <dt>Consumidos</dt>
                        <dd>
                          {c.consumed === null
                            ? "Não inicializado"
                            : number(c.consumed)}
                        </dd>
                      </div>
                      <div>
                        <dt>Restantes</dt>
                        <dd>
                          {c.remaining === null
                            ? "Não informado"
                            : number(c.remaining)}
                        </dd>
                      </div>
                      <div>
                        <dt>Capacidade nominal</dt>
                        <dd>
                          {c.capacity === null
                            ? "Não informada"
                            : number(c.capacity)}
                        </dd>
                      </div>
                    </dl>
                    <span className="section-meta">
                      {
                        {
                          ACTIVE: "Ativo",
                          MAINTENANCE: "Em manutenção",
                          RETIRED: "Arquivado",
                        }[c.status]
                      }
                    </span>
                  </article>
                ))}
              </div>
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
          <p className="section-meta">
            Registros mais recentes primeiro · horário de São Paulo. Correções e
            estornos preservam o lançamento original.
          </p>
          {!entries.length && (
            <p className="section-meta">
              Nenhuma movimentação de disparos registrada.
            </p>
          )}
          <ol className="shot-history">
            {entries.map((entry) => {
              const reversed =
                Boolean(entry.reversal) ||
                entries.some((other) => other.reversesId === entry.id);
              return (
                <li className="shot-history-entry" key={entry.id}>
                  <div className="shot-history-heading">
                    <div>
                      <strong>{labels[entry.type] ?? entry.type}</strong>
                      <span className="section-meta">
                        {" "}
                        #{entry.id} · {timestamp(entry.createdAt)}
                      </span>
                    </div>
                    <b
                      className={
                        entry.quantityDelta < 0
                          ? "shot-delta is-negative"
                          : "shot-delta"
                      }
                    >
                      {entry.quantityDelta > 0 ? "+" : ""}
                      {number(entry.quantityDelta)}
                    </b>
                  </div>
                  <p>
                    {entry.component?.name ??
                      (entry.componentId
                        ? `Componente #${entry.componentId}`
                        : "Contador do aparelho")}{" "}
                    · Registrado por{" "}
                    {entry.actor?.name ?? `usuário #${entry.actorId}`}
                  </p>
                  {entry.execution && (
                    <p className="section-meta">
                      {entry.execution.procedureName}
                      {entry.execution.variationName
                        ? ` · ${entry.execution.variationName}`
                        : ""}{" "}
                      · Profissional: {entry.execution.professional.name} ·
                      Atendimento #{entry.execution.attendanceId}
                    </p>
                  )}
                  {entry.reason && <p>{entry.reason}</p>}
                  {entry.reversesId && (
                    <p className="section-meta">
                      Estorna o lançamento #{entry.reversesId}.
                    </p>
                  )}
                  {entry.replacesId && (
                    <p className="section-meta">
                      Corrige o lançamento #{entry.replacesId}.
                    </p>
                  )}
                  {entry.reversal && (
                    <p className="section-meta">
                      Estornado pelo lançamento #{entry.reversal.id}.
                    </p>
                  )}
                  {entry.replacement && (
                    <p className="section-meta">
                      Quantidade corrigida no lançamento #{entry.replacement.id}
                      .
                    </p>
                  )}
                  <div className="equipment-actions">
                    {canManage &&
                      entry.type !== "OPENING" &&
                      entry.type !== "REVERSAL" &&
                      !reversed && (
                        <button
                          className="text-button"
                          type="button"
                          disabled={busy || loadingMore}
                          onClick={() => reverse(entry)}
                        >
                          Estornar com motivo
                        </button>
                      )}
                    {canManage && entry.type === "CONSUMPTION" && !reversed && (
                      <button
                        className="text-button"
                        type="button"
                        disabled={busy || loadingMore}
                        onClick={() => correct(entry)}
                      >
                        Corrigir quantidade
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {hasMore && (
            <button
              type="button"
              className="secondary-button"
              disabled={loadingMore || busy}
              onClick={loadMore}
            >
              {loadingMore ? "Carregando…" : "Carregar anteriores"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
