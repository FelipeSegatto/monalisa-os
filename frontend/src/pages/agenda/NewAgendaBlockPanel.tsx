import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import {
  createAgendaBlock,
  getProfessionals,
  type CurrentUser,
  type ProfessionalDetail,
} from "../../lib/api";

interface Props {
  close: () => void;
  onCreated: () => void;
  defaultDateKey: string;
  currentUser: CurrentUser | null;
}

export function NewAgendaBlockPanel({ close, onCreated, defaultDateKey, currentUser }: Props) {
  const lockedProfessionalId =
    currentUser?.role === "FUNCIONARIO" ? currentUser.professionalId : null;

  const [professionals, setProfessionals] = useState<ProfessionalDetail[]>([]);
  const [professionalId, setProfessionalId] = useState<number | "">(lockedProfessionalId ?? "");
  const [date, setDate] = useState(defaultDateKey);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lockedProfessionalId === null) {
      getProfessionals().then(setProfessionals).catch(() => undefined);
    }
  }, [lockedProfessionalId]);

  async function handleSave() {
    if (lockedProfessionalId === null && !professionalId) {
      setError("Selecione um profissional.");
      return;
    }
    const startsAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);
    if (endsAt <= startsAt) {
      setError("O horário final precisa ser depois do inicial.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createAgendaBlock({
        professionalId: lockedProfessionalId ?? (professionalId as number),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: reason.trim() ? reason.trim() : null,
      });
      setSaving(false);
      onCreated();
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Não foi possível marcar a indisponibilidade.");
    }
  }

  return (
    <SidePanel
      eyebrow="Agenda"
      title="Marcar indisponibilidade"
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
            {saving ? "Salvando…" : "Marcar indisponibilidade"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error ? <p className="form-error">{error}</p> : null}
          <label className="field">
            Profissional
            {lockedProfessionalId !== null ? (
              <input className="text-input" disabled value={currentUser?.name ?? "Você"} />
            ) : (
              <select
                className="select-input"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Selecione…</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <div className="field-grid">
            <label className="field">
              Data
              <input className="text-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              Início
              <input
                className="text-input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </label>
            <label className="field">
              Fim
              <input
                className="text-input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </label>
          </div>
          <label className="field">
            Motivo (opcional)
            <input
              className="text-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: Consulta médica"
            />
          </label>
        </div>
      </div>
    </SidePanel>
  );
}
