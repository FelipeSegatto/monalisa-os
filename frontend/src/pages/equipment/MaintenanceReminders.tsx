import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEquipment, type Equipment } from "../../lib/api";
import { maintenanceLabels } from "./EquipmentPage";
import "./equipment.css";
export function MaintenanceReminders() {
  const [items, setItems] = useState<Equipment[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    getEquipment()
      .then((r) => {
        if (live) setItems(r.equipment);
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, []);
  const reminders = items?.filter((i) =>
    ["OVERDUE", "DUE_SOON", "UNKNOWN"].includes(i.maintenanceState),
  );
  return (
    <section className="equipment-card">
      <h2>Manutenção dos equipamentos</h2>
      {error ? (
        <p>
          Não foi possível consultar as manutenções.{" "}
          <Link to="/equipamentos">Ver equipamentos</Link>
        </p>
      ) : !items ? (
        <p>Carregando…</p>
      ) : !items.length ? (
        <p>Nenhum equipamento cadastrado.</p>
      ) : !reminders?.length ? (
        <p>
          Nenhuma manutenção pendente ou próxima nos equipamentos cadastrados.
        </p>
      ) : (
        <ul>
          {reminders.map((i) => (
            <li key={i.id}>
              <Link to={`/equipamentos/${i.id}`}>{i.name}</Link> —{" "}
              {maintenanceLabels[i.maintenanceState]}
              {i.nextMaintenanceDate
                ? ` (${i.nextMaintenanceDate.split("-").reverse().join("/")})`
                : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
