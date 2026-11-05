import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  getProcedureCategories,
  getProfessionalCapabilities,
  saveProfessionalCapabilities,
  type ProfessionalCapabilities,
} from "../../lib/api";
const weekdays = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
const clock = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const minutes = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
};
export function ProfessionalCapabilitiesSection({ id }: { id: number }) {
  const [data, setData] = useState<ProfessionalCapabilities | null>(null),
    [procedures, setProcedures] = useState<
      { id: number; name: string; active: boolean }[]
    >([]),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.all([getProfessionalCapabilities(id), getProcedureCategories()])
      .then(([d, c]) => {
        if (!cancelled) {
          setData(d);
          setProcedures(c.flatMap((c) => c.procedures));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  async function save() {
    if (!data) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      setData(await saveProfessionalCapabilities(id, data));
      setSuccess("Habilitações e agenda salvas.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section>
      <div className="section-header">
        <span className="section-label">Procedimentos e disponibilidade</span>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      {!data && !error && <p>Carregando…</p>}
      {data && (
        <>
          <p className="section-meta">
            Selecione os procedimentos que este profissional pode executar. A
            agenda só oferece horários dentro da jornada cadastrada.
          </p>
          <div className="field-grid">
            {procedures.map((p) => (
              <label className="field" key={p.id}>
                <span>
                  <input
                    type="checkbox"
                    checked={data.procedureIds.includes(p.id)}
                    onChange={(e) =>
                      setData({
                        ...data,
                        procedureIds: e.target.checked
                          ? [...data.procedureIds, p.id]
                          : data.procedureIds.filter((id) => id !== p.id),
                      })
                    }
                  />{" "}
                  {p.name}
                  {!p.active ? " (inativo)" : ""}
                </span>
              </label>
            ))}
          </div>
          <label className="field">
            Prioridade no agendamento automático (menor número primeiro; vazio
            exclui da atribuição automática)
            <input
              className="text-input"
              type="number"
              min="0"
              max="100000"
              value={data.priority ?? ""}
              onChange={(e) =>
                setData({
                  ...data,
                  priority:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <p className="section-meta">
            Jornada em horário de São Paulo. Adicione mais de um período no
            mesmo dia para representar intervalos.
          </p>
          {data.workingPeriods.map((p, i) => (
            <div className="field-grid" key={i}>
              <label className="field">
                Dia
                <select
                  className="select-input"
                  value={p.weekday}
                  onChange={(e) =>
                    setData({
                      ...data,
                      workingPeriods: data.workingPeriods.map((v, j) =>
                        j === i ? { ...v, weekday: Number(e.target.value) } : v,
                      ),
                    })
                  }
                >
                  {weekdays.map((d, k) => (
                    <option key={k} value={k}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Das
                <input
                  className="text-input"
                  type="time"
                  value={clock(p.startMinute)}
                  onChange={(e) =>
                    setData({
                      ...data,
                      workingPeriods: data.workingPeriods.map((v, j) =>
                        j === i
                          ? { ...v, startMinute: minutes(e.target.value) }
                          : v,
                      ),
                    })
                  }
                />
              </label>
              <label className="field">
                Até
                <input
                  className="text-input"
                  type="time"
                  value={clock(p.endMinute)}
                  onChange={(e) =>
                    setData({
                      ...data,
                      workingPeriods: data.workingPeriods.map((v, j) =>
                        j === i
                          ? { ...v, endMinute: minutes(e.target.value) }
                          : v,
                      ),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setData({
                    ...data,
                    workingPeriods: data.workingPeriods.filter(
                      (_, j) => j !== i,
                    ),
                  })
                }
              >
                Remover período
              </button>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              setData({
                ...data,
                workingPeriods: [
                  ...data.workingPeriods,
                  { weekday: 1, startMinute: 540, endMinute: 1020 },
                ],
              })
            }
          >
            Adicionar período
          </button>{" "}
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Salvando…" : "Salvar habilitações e jornada"}
          </button>
          {data.affectedAppointments.map((a) => (
            <p key={a.id}>
              <Link
                to={`/agenda?date=${new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(a.startsAt))}`}
              >
                Revisar agendamento #{a.id}
              </Link>
            </p>
          ))}
          {data.affectedAppointments.length > 0 && (
            <p className="form-error" role="alert">
              {data.affectedAppointments.length} agendamento(s) futuro(s) com
              procedimento sem habilitação. Revise a agenda antes de confirmar.
            </p>
          )}
        </>
      )}
    </section>
  );
}
