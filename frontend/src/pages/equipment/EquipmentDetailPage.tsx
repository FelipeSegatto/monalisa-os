import { ShotLedgerSection } from "./ShotLedgerSection";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
  changeEquipmentStatus,
  createEquipmentComponent,
  getEquipmentDetail,
  getEquipmentHistory,
  recordEquipmentMaintenance,
  scheduleEquipmentMaintenance,
  updateEquipment,
  updateEquipmentComponent,
  type CurrentUser,
  type EquipmentDetail,
  type EquipmentStatus,
  type ComponentInput,
} from "../../lib/api";
import { maintenanceLabels, statusLabels } from "./EquipmentPage";
import "./equipment.css";
const eventLabels: Record<string, string> = {
  CREATED: "Cadastro do aparelho",
  UPDATED: "Cadastro atualizado",
  COMPONENT_CREATED: "Componente cadastrado",
  COMPONENT_UPDATED: "Componente atualizado",
  STATUS_CHANGED: "Situação alterada",
  MAINTENANCE_SCHEDULED: "Manutenção programada",
  MAINTENANCE_COMPLETED: "Manutenção realizada",
  PROCEDURE_COMPATIBILITY: "Compatibilidade revisada",
};
const date = (v: string | null) =>
  v ? v.slice(0, 10).split("-").reverse().join("/") : "Não informada";
export function EquipmentDetailPage() {
  const { id } = useParams();
  const equipmentId = Number(id);
  const user = useOutletContext<CurrentUser>();
  const [item, setItem] = useState<EquipmentDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyEnd, setHistoryEnd] = useState(false);
  const [action, setAction] = useState("");
  const [componentId, setComponentId] = useState<number | undefined>();
  useEffect(() => {
    let live = true;
    setItem(null);
    setError("");
    getEquipmentDetail(equipmentId)
      .then((r) => {
        if (live) setItem(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [equipmentId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const value = (key: string) => String(f.get(key) || "").trim();
    setBusy(true);
    setError("");
    try {
      let result: EquipmentDetail;
      if (action === "component") {
        const data: ComponentInput = {
          name: value("name"),
          serialNumber: value("serial") || null,
          specification: value("specification") || null,
          nominalCapacity: value("capacity") ? Number(value("capacity")) : null,
        };
        result =
          componentId === undefined
            ? await createEquipmentComponent(equipmentId, data)
            : await updateEquipmentComponent(equipmentId, componentId, data);
      } else if (action === "status")
        result = await changeEquipmentStatus(
          equipmentId,
          value("status") as EquipmentStatus,
          value("reason"),
          componentId,
        );
      else if (action === "schedule")
        result = await scheduleEquipmentMaintenance(
          equipmentId,
          value("next"),
          value("reason"),
        );
      else if (action === "maintenance")
        result = await recordEquipmentMaintenance(
          equipmentId,
          value("performed"),
          value("reason"),
          value("next") || undefined,
        );
      else
        result = await updateEquipment(equipmentId, {
          name: value("name"),
          manufacturer: value("manufacturer") || null,
          model: value("model") || null,
          serialNumber: value("serial") || null,
          shotTracking: value("tracking") as EquipmentDetail["shotTracking"],
          maintenanceIntervalMonths: Number(value("interval")),
        });
      setItem(result);
      setHistoryEnd(false);
      setAction("");
      setComponentId(undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory() {
    if (!item) return;
    setBusy(true);
    setError("");
    try {
      const r = await getEquipmentHistory(
        equipmentId,
        item.events[item.events.length - 1].id,
      );
      setItem({ ...item, events: [...item.events, ...r.events] });
      setHistoryEnd(r.events.length < 100);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function open(mode: string, component?: number) {
    setAction(mode);
    setComponentId(component);
    setError("");
  }
  if (!item)
    return (
      <div className="page">
        <Link to="/equipamentos">← Equipamentos</Link>
        <p role={error ? "alert" : undefined}>{error || "Carregando…"}</p>
      </div>
    );
  const canManage = user.role === "ADMIN" && item.status !== "RETIRED";
  const component = item.components.find((c) => c.id === componentId);
  return (
    <div className="page">
      <Link to="/equipamentos">← Equipamentos</Link>
      <header className="page-header">
        <h1 className="page-header-title">{item.name}</h1>
      </header>
      {error && <p role="alert">{error}</p>}
      <section className="equipment-card">
        <h2>Informações do aparelho</h2>
        <p>
          {item.code} · {statusLabels[item.status]}
        </p>
        <p>
          {[item.manufacturer, item.model].filter(Boolean).join(" · ") ||
            "Fabricante e modelo não informados"}
        </p>
        <p>Série: {item.serialNumber || "não informada"}</p>
        <p>
          Controle de disparos:{" "}
          {
            {
              NONE: "não se aplica",
              EQUIPMENT: "no aparelho",
              COMPONENT: "por componente",
            }[item.shotTracking]
          }
          . Contadores e saldos ainda não registrados.
        </p>
        {canManage && (
          <div className="equipment-actions">
            <button onClick={() => open("edit")}>Editar cadastro</button>
            <button onClick={() => open("status")}>Alterar situação</button>
          </div>
        )}
      </section>
      <section className="equipment-card">
        <h2>Manutenção</h2>
        <p>Intervalo: {item.maintenanceIntervalMonths} meses</p>
        <p>
          Última: {date(item.lastMaintenanceDate)} · Próxima:{" "}
          {date(item.nextMaintenanceDate)}
        </p>
        <p className="equipment-warning">
          {maintenanceLabels[item.maintenanceState]}
        </p>
        {canManage && (
          <div className="equipment-actions">
            <button onClick={() => open("schedule")}>
              Programar próxima manutenção
            </button>
            <button onClick={() => open("maintenance")}>
              Registrar manutenção realizada
            </button>
          </div>
        )}
      </section>
      {canManage && action && (
        <form
          key={`${action}-${componentId}`}
          className="equipment-card equipment-form"
          onSubmit={submit}
        >
          <h2>
            {
              (
                {
                  edit: "Editar aparelho",
                  component: component
                    ? "Editar componente"
                    : "Adicionar componente",
                  status: `Situação de ${component?.name || item.name}`,
                  schedule: "Programar manutenção",
                  maintenance: "Registrar manutenção realizada",
                } as Record<string, string>
              )[action]
            }
          </h2>
          {(action === "edit" || action === "component") && (
            <>
              <label>
                Nome
                <input
                  name="name"
                  required
                  maxLength={150}
                  defaultValue={action === "edit" ? item.name : component?.name}
                />
              </label>
              <label>
                Número de série (opcional)
                <input
                  name="serial"
                  maxLength={120}
                  defaultValue={
                    action === "edit"
                      ? item.serialNumber || ""
                      : component?.serialNumber || ""
                  }
                />
              </label>
            </>
          )}
          {action === "edit" && (
            <>
              <label>
                Fabricante
                <input
                  name="manufacturer"
                  maxLength={120}
                  defaultValue={item.manufacturer || ""}
                />
              </label>
              <label>
                Modelo
                <input
                  name="model"
                  maxLength={120}
                  defaultValue={item.model || ""}
                />
              </label>
              <label>
                Controle de disparos
                <select name="tracking" defaultValue={item.shotTracking}>
                  <option value="NONE">Não se aplica</option>
                  <option value="EQUIPMENT">No aparelho</option>
                  <option value="COMPONENT">Por componente</option>
                </select>
              </label>
              <label>
                Intervalo de manutenção (meses)
                <input
                  name="interval"
                  type="number"
                  min={1}
                  max={120}
                  required
                  defaultValue={item.maintenanceIntervalMonths}
                />
              </label>
              <p>Alterar o intervalo não muda a próxima data já programada.</p>
            </>
          )}
          {action === "component" && (
            <>
              <label>
                Especificação conhecida (opcional)
                <input
                  name="specification"
                  maxLength={500}
                  defaultValue={component?.specification || ""}
                />
              </label>
              <label>
                Capacidade nominal de disparos (opcional)
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={2147483647}
                  step={1}
                  defaultValue={component?.nominalCapacity ?? ""}
                />
              </label>
              <p>
                Capacidade não é saldo disponível. O uso anterior não será
                presumido como zero.
              </p>
            </>
          )}
          {action === "status" && (
            <label>
              Nova situação
              <select
                name="status"
                defaultValue={
                  (component?.status || item.status) === "ACTIVE"
                    ? "MAINTENANCE"
                    : "ACTIVE"
                }
              >
                {Object.entries(statusLabels)
                  .filter(([key]) => key !== (component?.status || item.status))
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
              <span>
                A aposentadoria é definitiva nesta etapa e preserva o histórico.
              </span>
            </label>
          )}
          {action === "maintenance" && (
            <label>
              Realizada em
              <input name="performed" type="date" required />
            </label>
          )}
          {(action === "schedule" || action === "maintenance") && (
            <label>
              Próxima manutenção{" "}
              {action === "maintenance"
                ? "(opcional; calculada pelo intervalo)"
                : ""}
              <input name="next" type="date" required={action === "schedule"} />
            </label>
          )}
          {["status", "maintenance", "schedule"].includes(action) && (
            <label>
              Justificativa / observações
              <textarea name="reason" minLength={3} maxLength={1000} required />
            </label>
          )}
          <div className="equipment-actions">
            <button disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
            <button type="button" disabled={busy} onClick={() => setAction("")}>
              Cancelar
            </button>
          </div>
        </form>
      )}
      <section className="equipment-card">
        <h2>Componentes</h2>
        {canManage && (
          <button onClick={() => open("component")}>
            Adicionar componente
          </button>
        )}
        {!item.components.length && (
          <p>
            Nenhum componente cadastrado. Isso não significa que o cadastro já
            foi conferido.
          </p>
        )}
        {item.components.map((c) => (
          <article className="equipment-card" key={c.id}>
            <h3>{c.name}</h3>
            <p>
              {c.code} · {statusLabels[c.status]}
            </p>
            <p>{c.specification || "Especificação não informada"}</p>
            <p>
              Capacidade nominal: {c.nominalCapacity ?? "não informada"} ·
              Saldo: não informado
            </p>
            {canManage && c.status !== "RETIRED" && (
              <div className="equipment-actions">
                <button onClick={() => open("component", c.id)}>
                  Editar componente
                </button>
                <button onClick={() => open("status", c.id)}>
                  Alterar situação
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
      <section className="equipment-card">
        <h2>Procedimentos compatíveis</h2>
        {item.procedures.length ? (
          item.procedures.map((p) => (
            <p key={p.procedure.id}>
              <Link to={`/procedimentos/${p.procedure.id}`}>
                {p.procedure.name}
              </Link>
            </p>
          ))
        ) : (
          <p>Nenhum procedimento associado.</p>
        )}
      </section>
      <section className="equipment-card">
        <h2>Histórico operacional</h2>
        <p>Registros mais recentes primeiro.</p>
        <ol className="equipment-history">
          {item.events.map((e) => (
            <li key={e.id}>
              <strong>{eventLabels[e.type] || e.type}</strong>
              {typeof e.details.resourceName === "string" &&
                ` · ${e.details.resourceName}`}{" "}
              · {new Date(e.createdAt).toLocaleString("pt-BR")} · {e.actor.name}
              {e.occurredOn && ` · Realizada em ${date(e.occurredOn)}`}
              {e.reason && <p>{e.reason}</p>}
              {e.type === "STATUS_CHANGED" && (
                <p>
                  {statusLabels[e.details.from as EquipmentStatus]} →{" "}
                  {statusLabels[e.details.to as EquipmentStatus]}
                </p>
              )}
              {typeof e.details.nextDate === "string" && (
                <p>Próxima manutenção: {date(e.details.nextDate)}</p>
              )}
            </li>
          ))}
        </ol>
        {!historyEnd && item.events.length >= 100 && (
          <button disabled={busy} onClick={loadHistory}>
            Ver registros anteriores
          </button>
        )}
      </section>
      <ShotLedgerSection equipmentId={equipmentId} canManage={user?.role === "ADMIN"} />
    </div>
  );
}
