import { useEffect, useState } from "react";
import {
  getProcedureMetrics,
  type ProcedureActivityMetric,
} from "../../../lib/api";
export function ProcedureActivitySection() {
  const [month, setMonth] = useState(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }),
    [items, setItems] = useState<ProcedureActivityMetric[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError("");
    getProcedureMetrics(month)
      .then((d) => {
        if (!cancelled) setItems(d.procedures);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);
  return (
    <section>
      <div className="section-header">
        <span className="section-label">Execução dos procedimentos</span>
        <label className="field">
          Mês
          <input
            className="text-input"
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
      </div>
      <p className="section-meta">
        Atendimentos concluídos pelo novo registro. Uso de materiais indica
        frequência, sem estimar gramas ou custo por sessão. Valores de disparos
        incluem correções vinculadas às execuções.
      </p>
      {error && <p className="form-error">{error}</p>}
      {!items && !error && <p>Carregando…</p>}
      {items?.length === 0 && (
        <p className="page-status">
          Nenhuma execução neste mês ou no anterior.
        </p>
      )}
      {items?.map((p) => (
        <details key={p.procedureId}>
          <summary>
            {p.procedureName} · {p.executions} execuções · {p.shots} disparos
          </summary>
          <p className="section-meta">
            Mês anterior: {p.previousExecutions} execuções e {p.previousShots}{" "}
            disparos.
          </p>
          {p.options.length > 0 && (
            <>
              <p>Áreas e opções realizadas</p>
              <ul>
                {[...p.options]
                  .sort((a, b) => b.executions - a.executions)
                  .map((o, i) => (
                    <li key={`${o.variationId}-${i}`}>
                      {o.name}: {o.executions}
                    </li>
                  ))}
              </ul>
            </>
          )}
          {p.materials.length > 0 && (
            <>
              <p>Materiais confirmados por execução</p>
              <ul>
                {p.materials.map((m) => (
                  <li key={m.stockItemId}>
                    {m.materialName}: usou {m.used} · pouca quantidade {m.small}{" "}
                    · não usou {m.notUsed}
                  </li>
                ))}
              </ul>
            </>
          )}
        </details>
      ))}
    </section>
  );
}
