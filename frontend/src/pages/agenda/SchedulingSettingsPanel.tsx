import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import {
  getSchedulingSettings,
  saveSchedulingSettings,
  type SchedulingSettings,
} from "../../lib/api";
export function SchedulingSettingsPanel({ close }: { close: () => void }) {
  const [data, setData] = useState<SchedulingSettings | null>(null),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getSchedulingSettings()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function save() {
    if (!data) return;
    setSaving(true);
    setError("");
    try {
      await saveSchedulingSettings(data);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SidePanel
      eyebrow="Agenda"
      title="Regras de agendamento"
      close={close}
      footer={
        <button
          className="primary-button"
          type="button"
          disabled={!data || saving}
          onClick={save}
        >
          {saving ? "Salvando…" : "Salvar regras"}
        </button>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error && <p className="form-error">{error}</p>}
          {data && (
            <>
              <label className="field">
                Atribuição de profissional
                <select
                  className="select-input"
                  value={data.assignmentPolicy}
                  onChange={(e) =>
                    setData({
                      ...data,
                      assignmentPolicy: e.target
                        .value as SchedulingSettings["assignmentPolicy"],
                    })
                  }
                >
                  <option value="PRIORITY">Ordem de prioridade</option>
                  <option value="BALANCED">Distribuição equilibrada</option>
                  <option value="MANUAL">Somente atribuição manual</option>
                </select>
              </label>
              <p className="section-meta">
                {data.assignmentPolicy === "BALANCED"
                  ? "Prefere o profissional habilitado e disponível com menos minutos de agendamentos no dia, no horário de São Paulo. Empates seguem um rodízio. A ordem de prioridade não é usada neste modo."
                  : data.assignmentPolicy === "PRIORITY"
                    ? "Configure a prioridade e a jornada na página de cada profissional. Menores números têm preferência no mesmo horário."
                    : "A escolha do profissional deve ser manual. A reserva pública automática fica desabilitada."}
              </p>
              <label className="field">
                Confirmação de reservas externas
                <select
                  className="select-input"
                  value={data.confirmationMode}
                  onChange={(e) =>
                    setData({
                      ...data,
                      confirmationMode: e.target
                        .value as SchedulingSettings["confirmationMode"],
                    })
                  }
                >
                  <option value="MANUAL">Confirmação profissional</option>
                  <option value="AUTOMATIC">Confirmar automaticamente</option>
                </select>
              </label>
              <label className="field">
                Prazo da reserva provisória (minutos)
                <input
                  className="text-input"
                  type="number"
                  min="5"
                  max="10080"
                  value={data.holdMinutes}
                  onChange={(e) =>
                    setData({ ...data, holdMinutes: Number(e.target.value) })
                  }
                />
              </label>
            </>
          )}
        </div>
      </div>
    </SidePanel>
  );
}
