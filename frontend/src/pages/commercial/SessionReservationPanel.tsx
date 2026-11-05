import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { type AgendaAppointment } from "../../lib/api";
import { getEntitlements, reserveEntitlement, type Entitlement } from "./api";
export function SessionReservationPanel({
  appointment,
  close,
  onSaved,
}: {
  appointment: AgendaAppointment;
  close: () => void;
  onSaved: () => void;
}) {
  const [rights, setRights] = useState<Entitlement[]>([]),
    [selected, setSelected] = useState<number | "">(
      appointment.sessionReservation?.status === "ACTIVE"
        ? appointment.sessionReservation.entitlementId
        : "",
    ),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getEntitlements(appointment.customerId)
      .then((r) => {
        if (!cancelled) {
          setRights(
            r.entitlements.filter(
              (e) => e.procedureId === appointment.procedureId,
            ),
          );
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.customerId, appointment.procedureId]);
  async function save() {
    setSaving(true);
    setError("");
    try {
      const right = rights.find((r) => r.id === selected);
      await reserveEntitlement(
        appointment.id,
        right?.id ?? null,
        right?.variationId ?? null,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível vincular.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SidePanel
      eyebrow="Agenda"
      title="Vínculo comercial"
      close={close}
      footer={
        <button
          type="button"
          className="primary-button"
          disabled={saving || loading}
          onClick={save}
        >
          {saving ? "Salvando…" : "Salvar vínculo"}
        </button>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error && <p className="form-error">{error}</p>}
          <p>
            {appointment.customerName} · {appointment.procedureName}
          </p>
          <label className="field">
            Sessão adquirida
            <select
              className="select-input"
              value={selected}
              onChange={(e) =>
                setSelected(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">Sem vínculo comercial / liberar reserva</option>
              {rights
                .filter((e) => e.available > 0 || e.id === selected)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.description} · Venda #{e.saleId} · {e.available}{" "}
                    disponíveis
                  </option>
                ))}
            </select>
          </label>
          <p className="section-meta">
            O vínculo reserva uma sessão deste pacote. A utilização definitiva
            acontece ao concluir o atendimento.
          </p>
        </div>
      </div>
    </SidePanel>
  );
}
