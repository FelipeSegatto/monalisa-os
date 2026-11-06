import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  createEquipment,
  getEquipment,
  type CurrentUser,
  type Equipment,
} from "../../lib/api";
import "./equipment.css";
export const statusLabels = {
  ACTIVE: "Ativo",
  MAINTENANCE: "Em manutenção",
  RETIRED: "Arquivado",
};
export const maintenanceLabels = {
  UNKNOWN: "Data não informada",
  OVERDUE: "Manutenção atrasada",
  DUE_SOON: "Manutenção em até 30 dias",
  OK: "Em dia",
  NOT_APPLICABLE: "Não se aplica",
};
export function EquipmentPage() {
  const user = useOutletContext<CurrentUser>();
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("current");
  const visibleItems = items.filter(
    (item) =>
      filter === "all" ||
      (filter === "archived"
        ? item.status === "RETIRED"
        : item.status !== "RETIRED"),
  );
  useEffect(() => {
    let live = true;
    getEquipment()
      .then((r) => {
        if (live) setItems(r.equipment);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await createEquipment({
        name: String(data.get("name")),
        manufacturer: String(data.get("manufacturer") || "") || null,
        model: String(data.get("model") || "") || null,
        serialNumber: String(data.get("serial") || "") || null,
        shotTracking: String(data.get("tracking")) as Equipment["shotTracking"],
        maintenanceIntervalMonths: Number(data.get("interval")),
      });
      setItems((await getEquipment()).equipment);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Estrutura da clínica</p>
          <h1 className="page-header-title">Equipamentos</h1>
        </div>
        {user.role === "ADMIN" && (
          <button className="primary-button" onClick={() => setOpen(!open)}>
            {open ? "Fechar cadastro" : "Novo equipamento"}
          </button>
        )}
      </header>
      {error && <p role="alert">{error}</p>}
      {open && (
        <form className="equipment-card equipment-form" onSubmit={submit}>
          <label>
            Nome
            <input name="name" required maxLength={150} />
          </label>
          <label>
            Fabricante (opcional)
            <input name="manufacturer" maxLength={120} />
          </label>
          <label>
            Modelo (opcional)
            <input name="model" maxLength={120} />
          </label>
          <label>
            Número de série (opcional)
            <input name="serial" maxLength={120} />
          </label>
          <label>
            Controle de disparos
            <select name="tracking">
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
              defaultValue={12}
              required
            />
          </label>
          <p>
            O código interno será gerado automaticamente. Datas e contadores
            desconhecidos permanecem sem informação.
          </p>
          <button className="primary-button" disabled={busy}>
            Salvar equipamento
          </button>
        </form>
      )}
      <section>
        <div className="section-header">
          <label className="field">
            Exibir
            <select
              className="select-input"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="current">Em operação e manutenção</option>
              <option value="archived">Arquivados</option>
              <option value="all">Todos</option>
            </select>
          </label>
          <span className="section-meta">
            {visibleItems.length}{" "}
            {visibleItems.length === 1 ? "aparelho" : "aparelhos"}
          </span>
        </div>
        {loading ? (
          <p className="page-status">Carregando…</p>
        ) : (
          <div className="equipment-list">
            {!visibleItems.length && (
              <p className="section-meta">Nenhum equipamento nesta seleção.</p>
            )}
            {visibleItems.map((item) => (
              <article className="equipment-row" key={item.id}>
                <div className="equipment-identity">
                  <Link className="row-title" to={`/equipamentos/${item.id}`}>
                    {item.name}
                  </Link>
                  <span className="section-meta">
                    {[item.manufacturer, item.model]
                      .filter(Boolean)
                      .join(" · ") || "Fabricante não informado"}
                  </span>
                  <span
                    className={
                      item.status === "ACTIVE"
                        ? "active-badge is-active"
                        : "active-badge"
                    }
                  >
                    {statusLabels[item.status]}
                  </span>
                </div>
                <div className="equipment-stat">
                  <span className="section-meta">Última manutenção</span>
                  <b>
                    {item.lastMaintenanceDate
                      ? item.lastMaintenanceDate
                          .slice(0, 10)
                          .split("-")
                          .reverse()
                          .join("/")
                      : "Não informada"}
                  </b>
                </div>
                <div className="equipment-stat">
                  <span className="section-meta">Próxima manutenção</span>
                  <b>
                    {item.nextMaintenanceDate
                      ? item.nextMaintenanceDate
                          .slice(0, 10)
                          .split("-")
                          .reverse()
                          .join("/")
                      : "Não programada"}
                  </b>
                  <span
                    className={
                      ["DUE_SOON", "OVERDUE"].includes(item.maintenanceState)
                        ? "equipment-warning"
                        : "section-meta"
                    }
                  >
                    {maintenanceLabels[item.maintenanceState]}
                  </span>
                </div>
                <Link className="section-link" to={`/equipamentos/${item.id}`}>
                  Ver detalhes →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
