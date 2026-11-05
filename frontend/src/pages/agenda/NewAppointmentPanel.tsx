import {getEntitlements,type Entitlement} from "../commercial/api";
import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { CustomerSearchSelect } from "../../components/CustomerSearchSelect";
import {
  createAppointment,
  getCustomers,
  getProcedureCategories,
  getAvailableProfessionals,
  type AppointmentStatus,
  type CustomerListItem,
  type Procedure,
  type ProfessionalDetail,
} from "../../lib/api";

interface Props {
  close: () => void;
  onCreated: () => void;
  defaultDateKey: string;
}

function toDateInputValue(dateKey: string): string {
  return dateKey;
}

export function NewAppointmentPanel({
  close,
  onCreated,
  defaultDateKey,
}: Props) {
  const [rights,setRights]=useState<Entitlement[]>([]);
  const [entitlementId,setEntitlementId]=useState<number|"">("");
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDetail[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  const [customerId, setCustomerId] = useState<number | "">("");
  const [procedureId, setProcedureId] = useState<number | "">("");
  const [professionalId, setProfessionalId] = useState<number | "">("");
  const [date, setDate] = useState(toDateInputValue(defaultDateKey));
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(30);
  const [status, setStatus] = useState<AppointmentStatus>("SCHEDULED");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCustomers({})
      .then(setCustomers)
      .catch(() => undefined);

    getProcedureCategories()
      .then((categories) =>
        setProcedures(
          categories.flatMap((c) => c.procedures).filter((p) => p.active),
        ),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const p = procedures.find((p) => p.id === procedureId);
    if (p) setDuration(p.durationMinutes);
  }, [procedureId, procedures]);
  useEffect(() => {
    setProfessionalId("");
    setProfessionals([]);
    if (
      !procedureId ||
      !date ||
      !time ||
      !Number.isInteger(duration) ||
      duration < 1
    )
      return;
    const startsAt = new Date(`${date}T${time}:00`);
    if (!Number.isFinite(+startsAt)) return;
    let cancelled = false;
    getAvailableProfessionals(procedureId, startsAt.toISOString(), duration)
      .then((p) => {
        if (!cancelled) setProfessionals(p as ProfessionalDetail[]);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [procedureId, date, time, duration]);

  useEffect(()=>{setEntitlementId('');setRights([]);if(!customerId)return;let cancelled=false;getEntitlements(customerId).then(r=>{if(!cancelled)setRights(r.entitlements);}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[customerId]);
  useEffect(()=>{setEntitlementId('');},[procedureId]);
  async function handleSave() {
    if (!customerId || !procedureId) {
      setError("Cliente e procedimento são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAppointment({
        customerId,
        entitlementId:entitlementId||undefined,
        variationId:rights.find(r=>r.id===entitlementId)?.variationId,
        procedureId,
        professionalId: professionalId || undefined,
        durationMinutes: duration,
        startsAt: new Date(`${date}T${time}:00`).toISOString(),
        status,
      });
      setSaving(false);
      onCreated();
    } catch (err) {
      setSaving(false);
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar o agendamento.",
      );
    }
  }

  return (
    <SidePanel
      eyebrow="Agenda"
      title="Novo agendamento"
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
            {saving ? "Criando…" : "Criar agendamento"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error ? <p className="form-error">{error}</p> : null}
          <label className="field">
            Cliente
            <CustomerSearchSelect
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
            />
          </label>
          <label className="field">
            Procedimento
            <select
              className="select-input"
              value={procedureId}
              onChange={(e) =>
                setProcedureId(e.target.value ? Number(e.target.value) : "")
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
          <label className="field">Sessão adquirida (opcional)<select className="select-input" value={entitlementId} onChange={e=>setEntitlementId(e.target.value?Number(e.target.value):'')}><option value="">Sem vínculo comercial</option>{rights.filter(r=>r.procedureId===procedureId&&r.available>0).map(r=><option key={r.id} value={r.id}>{r.description} · Venda #{r.saleId} · {r.available} disponíveis</option>)}</select></label>
          <div className="field-grid">
            <label className="field">
              Data
              <input
                className="text-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field">
              Horário
              <input
                className="text-input"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            Duração reservada (minutos)
            <input
              className="text-input"
              type="number"
              min="1"
              max="720"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
          <label className="field">
            Profissional
            <select
              className="select-input"
              value={professionalId}
              onChange={(e) =>
                setProfessionalId(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Atribuir por prioridade</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Status
            <select
              className="select-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            >
              <option value="SCHEDULED">Aguardando confirmação</option>
              <option value="CONFIRMED">Confirmado</option>
            </select>
          </label>
        </div>
      </div>
    </SidePanel>
  );
}
