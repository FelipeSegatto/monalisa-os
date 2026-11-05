import {getEntitlements,type Entitlement} from "../commercial/api";
import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import {
  cancelAttendance,
  startAttendance,
  completeAttendance,
  getProcedure,
  getProcedureMaterials,
  getProcedureEquipment,
  getStockItems,
  type AgendaAppointment,
  type ProcedureDetail,
  type ProcedureMaterial,
  type Equipment,
  type StockItem,
  type MaterialUseAnswer,
} from "../../lib/api";
export function AttendancePanel({
  appointment,
  close,
  onCompleted,
}: {
  appointment: AgendaAppointment;
  close: () => void;
  onCompleted: () => void;
}) {
  const [rights,setRights]=useState<Entitlement[]>([]);
  const [entitlementId,setEntitlementId]=useState<number|"">(appointment.sessionReservation?.status==="ACTIVE"?appointment.sessionReservation.entitlementId:"");
  const [id, setId] = useState<number | null>(null),
    [procedure, setProcedure] = useState<ProcedureDetail | null>(null),
    [expected, setExpected] = useState<ProcedureMaterial[]>([]),
    [equipment, setEquipment] = useState<Equipment[]>([]),
    [stock, setStock] = useState<StockItem[]>([]);
  const [equipmentId, setEquipmentId] = useState<number | "">(
      appointment.equipmentId ?? "",
    ),
    [variationId, setVariationId] = useState<number | "">(appointment.sessionReservation?.entitlement.variationId??""),
    [answers, setAnswers] = useState<Record<number, MaterialUseAnswer | "">>(
      {},
    ),
    [shots, setShots] = useState<Record<string, string>>({}),
    [extra, setExtra] = useState<number[]>([]);
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getProcedure(appointment.procedureId),
      getProcedureMaterials(appointment.procedureId),
      getProcedureEquipment(appointment.procedureId),
      getStockItems(),
    ])
      .then(([p, m, e, s]) => {
        if (!cancelled) {
          setProcedure(p);
          setExpected(m);
          setEquipment(e.equipment.filter((v) => v.status === "ACTIVE"));
          setStock(s);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.procedureId]);
  useEffect(()=>{let cancelled=false;getEntitlements(appointment.customerId).then(r=>{if(!cancelled)setRights(r.entitlements.filter(e=>e.procedureId===appointment.procedureId));}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[appointment.customerId,appointment.procedureId]);
  const selected = equipment.find((e) => e.id === equipmentId);
  const materials = [
    ...expected.map((m) => ({ id: m.stockItemId, name: m.itemName })),
    ...extra.map((id) => ({
      id,
      name: stock.find((s) => s.id === id)?.name ?? String(id),
    })),
  ];
  async function start() {
    setSaving(true);
    setError("");
    try {
      const a = await startAttendance(appointment.id);
      if (a.status === "COMPLETED" || a.status === "CANCELLED") {
        onCompleted();
        return;
      }
      setId(a.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar.");
    } finally {
      setSaving(false);
    }
  }
  async function cancel() {
    if (!id) return;
    const reason = window.prompt(
      "Motivo do cancelamento do atendimento e do agendamento",
    );
    if (!reason) return;
    setSaving(true);
    setError("");
    try {
      await cancelAttendance(id, reason);
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível cancelar.");
    } finally {
      setSaving(false);
    }
  }
  async function complete() {
    if (!id || !procedure) return;
    if (materials.some((m) => !answers[m.id])) {
      setError("Responda sobre todos os materiais antes de concluir.");
      return;
    }
    const counts =
      selected?.shotTracking === "COMPONENT"
        ? selected.components
            .filter(
              (c) => c.status === "ACTIVE" && Number(shots[String(c.id)]) > 0,
            )
            .map((c) => ({
              componentId: c.id,
              quantity: Number(shots[String(c.id)]),
            }))
        : selected?.shotTracking === "EQUIPMENT"
          ? [{ quantity: Number(shots.equipment) }]
          : [];
    if (
      selected &&
      selected.shotTracking !== "NONE" &&
      (!counts.length ||
        counts.some((s) => !Number.isInteger(s.quantity) || s.quantity <= 0))
    ) {
      setError("Informe os disparos utilizados.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await completeAttendance(id, {
        requestKey: key,
        executions: [
          {
            procedureId: procedure.id,
            entitlementId:entitlementId||null,
            professionalId: appointment.professionalId,
            variationId: variationId || null,
            equipmentId: equipmentId || null,
            materials: materials.map((m) => ({
              stockItemId: m.id,
              usage: answers[m.id] as MaterialUseAnswer,
            })),
            shots: counts,
          },
        ],
      });
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SidePanel
      eyebrow="Atendimento"
      title={appointment.customerName}
      close={close}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={close}>
            Fechar
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving || !procedure}
            onClick={id ? complete : start}
          >
            {saving
              ? "Salvando…"
              : id
                ? "Concluir atendimento"
                : "Iniciar atendimento"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p>
            {appointment.procedureName} · {appointment.professionalName}
          </p>
          {!id ? (
            <p className="section-meta">
              Inicie para registrar o que foi realizado. Fechar este painel
              depois de iniciar mantém o atendimento em andamento.
            </p>
          ) : (
            <>
              {!!procedure?.variations.filter((v) => v.active).length && (
                <label className="field">
                  Área ou opção realizada
                  <select
                    className="select-input"
                    value={variationId}
                    onChange={(e) =>
                      setVariationId(
                        e.target.value ? Number(e.target.value) : "",
                      )
                    }
                  >
                    <option value="">Sem opção específica</option>
                    {procedure.variations
                      .filter((v) => v.active)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.groupName ? `${v.groupName} · ` : ""}
                          {v.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label className="field">Sessão do pacote<select className="select-input" value={entitlementId} disabled={appointment.sessionReservation?.status==='ACTIVE'} onChange={e=>{const id=e.target.value?Number(e.target.value):'';setEntitlementId(id);const r=rights.find(r=>r.id===id);if(r)setVariationId(r.variationId??'');}}><option value="">Sem vínculo comercial</option>{rights.filter(r=>r.available>0||r.id===entitlementId).map(r=><option key={r.id} value={r.id}>{r.description} · Venda #{r.saleId}</option>)}</select></label>
              <label className="field">
                Equipamento utilizado
                <select
                  className="select-input"
                  value={equipmentId}
                  onChange={(e) => {
                    setEquipmentId(
                      e.target.value ? Number(e.target.value) : "",
                    );
                    setShots({});
                  }}
                >
                  <option value="">Nenhum</option>
                  {equipment.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </label>
              {selected?.shotTracking === "EQUIPMENT" && (
                <label className="field">
                  Disparos utilizados
                  <input
                    className="text-input"
                    type="number"
                    min="1"
                    step="1"
                    value={shots.equipment ?? ""}
                    onChange={(e) =>
                      setShots({ ...shots, equipment: e.target.value })
                    }
                  />
                </label>
              )}
              {selected?.shotTracking === "COMPONENT" && (
                <>
                  <p className="section-meta">
                    Informe os disparos dos cartuchos utilizados; deixe os
                    demais vazios.
                  </p>
                  {selected.components
                    .filter((c) => c.status === "ACTIVE")
                    .map((c) => (
                      <label className="field" key={c.id}>
                        {c.name}
                        <input
                          className="text-input"
                          type="number"
                          min="0"
                          step="1"
                          value={shots[String(c.id)] ?? ""}
                          onChange={(e) =>
                            setShots({ ...shots, [c.id]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                </>
              )}
              <div className="section-header">
                <span className="section-label">Materiais utilizados</span>
              </div>
              <p className="section-meta">
                Confirme cada item. Estas respostas não dão baixa no estoque.
              </p>
              {materials.map((m) => (
                <label className="field" key={m.id}>
                  {m.name}
                  <select
                    className="select-input"
                    required
                    value={answers[m.id] ?? ""}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        [m.id]: e.target.value as MaterialUseAnswer | "",
                      })
                    }
                  >
                    <option value="">Informe o uso…</option>
                    <option value="USED">Usou</option>
                    <option value="SMALL">Usou pouca quantidade</option>
                    <option value="NOT_USED">Não usou</option>
                  </select>
                </label>
              ))}
              <label className="field">
                Adicionar outro material
                <select
                  className="select-input"
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      setExtra([...extra, Number(e.target.value)]);
                  }}
                >
                  <option value="">Selecione…</option>
                  {stock
                    .filter(
                      (s) => s.active && !materials.some((m) => m.id === s.id),
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                type="button"
                className="text-button is-danger"
                disabled={saving}
                onClick={cancel}
              >
                Cancelar atendimento com motivo
              </button>
            </>
          )}
        </div>
      </div>
    </SidePanel>
  );
}
