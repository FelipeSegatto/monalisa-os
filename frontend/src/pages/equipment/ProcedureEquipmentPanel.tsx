import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getEquipment,
  getProcedureEquipment,
  setProcedureEquipment,
  type Equipment,
  type ProcedureEquipmentResources,
} from "../../lib/api";
import { statusLabels } from "./EquipmentPage";
import "./equipment.css";
export function ProcedureEquipmentPanel({
  procedureId,
  canManage,
}: {
  procedureId: number;
  canManage: boolean;
}) {
  const [resources, setResources] =
    useState<ProcedureEquipmentResources | null>(null);
  const [items, setItems] = useState<Equipment[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all([getProcedureEquipment(procedureId), getEquipment()])
      .then(([r, all]) => {
        if (live) {
          setResources(r);
          setSelected(r.equipment.map((e) => e.id));
          setItems(all.equipment);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [procedureId]);
  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      setResources(await setProcedureEquipment(procedureId, selected));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="equipment-card">
      <h2>Recursos e operação</h2>
      {error && <p role="alert">{error}</p>}
      {!resources && !error && <p>Carregando recursos…</p>}
      {resources && (
        <>
          <p>
            {!resources.reviewedAt
              ? "Equipamentos: configuração pendente de revisão."
              : !resources.equipment.length
                ? "Revisado: este procedimento não utiliza equipamentos."
                : "Equipamentos compatíveis revisados."}
          </p>
          <p>
            Materiais:{" "}
            {resources.materialsReviewedAt
              ? "configuração revisada; consulte os materiais previstos nesta página."
              : "configuração ainda não revisada."}
          </p>
          {items.map((item) => (
            <div key={item.id} className="equipment-check">
              {canManage && (
                <input
                  aria-label={`Compatível com ${item.name}`}
                  type="checkbox"
                  disabled={busy || item.status === "RETIRED"}
                  checked={selected.includes(item.id)}
                  onChange={(e) => {
                    setSaved(false);
                    setSelected(
                      e.target.checked
                        ? [...selected, item.id]
                        : selected.filter((id) => id !== item.id),
                    );
                  }}
                />
              )}
              <Link to={`/equipamentos/${item.id}`}>{item.name}</Link>
              <span>
                · {statusLabels[item.status]}
                {resources.equipment.some((e) => e.id === item.id)
                  ? " · compatível"
                  : ""}
              </span>
              {canManage &&
                item.status === "RETIRED" &&
                selected.includes(item.id) && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      setSelected(selected.filter((id) => id !== item.id))
                    }
                  >
                    Remover compatibilidade
                  </button>
                )}
            </div>
          ))}
          {canManage && (
            <>
              <p>
                Salvar sem equipamentos confirma que o procedimento não os
                utiliza.
              </p>
              <button type="button" disabled={busy} onClick={save}>
                {busy ? "Salvando…" : "Salvar e marcar como revisado"}
              </button>
            </>
          )}
          {saved && <p role="status">Configuração salva.</p>}
          <p>
            Compatibilidade não reserva o aparelho na agenda. Consumo e disparos
            serão registrados na etapa de atendimentos.
          </p>
        </>
      )}
    </section>
  );
}
