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
  RETIRED: "Aposentado",
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
        <h1 className="page-header-title">Equipamentos</h1>
        {user.role === "ADMIN" && (
          <button onClick={() => setOpen(!open)}>Cadastrar equipamento</button>
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
          <button disabled={busy}>Salvar equipamento</button>
        </form>
      )}
      {loading ? (
        <p>Carregando…</p>
      ) : !items.length && !error ? (
        <p>Nenhum equipamento cadastrado.</p>
      ) : (
        <div className="equipment-grid">
          {items.map((item) => (
            <article className="equipment-card" key={item.id}>
              <h2>
                <Link to={`/equipamentos/${item.id}`}>{item.name}</Link>
              </h2>
              <p>{statusLabels[item.status]}</p>
              <p>{item.components.length} componente(s)</p>
              <p
                className={
                  ["DUE_SOON", "OVERDUE"].includes(item.maintenanceState)
                    ? "equipment-warning"
                    : ""
                }
              >
                {maintenanceLabels[item.maintenanceState]}
                {item.nextMaintenanceDate
                  ? ` · ${item.nextMaintenanceDate.split("-").reverse().join("/")}`
                  : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
