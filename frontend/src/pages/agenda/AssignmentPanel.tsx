import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import {
  getReassignmentCandidates,
  reassignAppointment,
  type AgendaAppointment,
} from "../../lib/api";
export function AssignmentPanel({
  appointment,
  close,
  onSaved,
}: {
  appointment: AgendaAppointment;
  close: () => void;
  onSaved: () => void;
}) {
  const [candidates, setCandidates] = useState<
      { id: number; name: string }[] | null
    >(null),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getReassignmentCandidates(appointment)
      .then((p) => {
        if (!cancelled) setCandidates(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [appointment]);
  async function save() {
    setSaving(true);
    setError("");
    try {
      await reassignAppointment(
        appointment.id,
        selected ? Number(selected) : undefined,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível reatribuir.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SidePanel
      eyebrow="Agenda"
      title="Reatribuir profissional"
      close={close}
      footer={
        <button
          type="button"
          className="primary-button"
          disabled={saving || !candidates}
          onClick={save}
        >
          {saving ? "Salvando…" : "Salvar atribuição"}
        </button>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error && <p className="form-error">{error}</p>}
          <p>
            {appointment.customerName} · {appointment.procedureName}
          </p>
          <p className="section-meta">
            O intervalo reservado será preservado. Apenas profissionais
            habilitados e disponíveis podem receber este agendamento.
          </p>
          <label className="field">
            Profissional
            <select
              className="select-input"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Escolher automaticamente</option>
              {candidates?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </SidePanel>
  );
}
