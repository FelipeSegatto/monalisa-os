import { useEffect, useMemo, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { formatPrice } from "../../lib/format";
import {
  getPublicCatalog,
  type CreateExpenseInput,
  type ExpenseBasis,
  type ExpenseCategory,
  type ExpenseDestination,
  type ExpenseRecurrence,
  type Procedure,
} from "./api";
import "./expenses.css";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "INSUMOS", label: "Insumos" },
  { value: "EQUIPAMENTOS_MANUTENCAO", label: "Equipamentos e manutenção" },
  { value: "MARKETING", label: "Marketing" },
  { value: "ALUGUEL_ESTRUTURA", label: "Aluguel e estrutura" },
  { value: "SERVICOS", label: "Serviços" },
  { value: "PESSOAL", label: "Pessoal" },
  { value: "OUTROS", label: "Outros" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

interface ProcedureLine {
  procedureId: number;
  value: number;
}

interface Props {
  close: () => void;
  onSubmit: (input: CreateExpenseInput) => void | Promise<void>;
  busy: boolean;
  title?: string;
  initial?: Partial<CreateExpenseInput>;
}

export function ExpenseEditor({ close, onSubmit, busy, title, initial }: Props) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(initial?.category ?? "INSUMOS");
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? 0);
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? todayISO());
  const [competenceMonth, setCompetenceMonth] = useState(
    initial?.competenceMonth ?? currentMonth(),
  );
  const [recurrence, setRecurrence] = useState<ExpenseRecurrence>(
    initial?.recurrence ?? "ONCE",
  );
  const [destination, setDestination] = useState<ExpenseDestination>(
    initial?.destination ?? "GENERAL",
  );
  const [basis, setBasis] = useState<ExpenseBasis>(initial?.basis ?? "VALUE");
  const [generalValue, setGeneralValue] = useState<number>(() => {
    const line = initial?.allocations?.find((a) => a.procedureId === null);
    return line ? line.value : 0;
  });
  const [procedureLines, setProcedureLines] = useState<ProcedureLine[]>(() =>
    (initial?.allocations ?? [])
      .filter((a): a is { procedureId: number; value: number } => a.procedureId !== null)
      .map((a) => ({ procedureId: a.procedureId, value: a.value })),
  );
  const [allocationNote, setAllocationNote] = useState(initial?.allocationNote ?? "");
  const [reason, setReason] = useState("");
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  useEffect(() => {
    getPublicCatalog()
      .then((categories) => setProcedures(categories.flatMap((c) => c.procedures).filter((p) => p.active)))
      .catch(() => setProcedures([]));
  }, []);

  useEffect(() => {
    if (destination === "GENERAL") {
      setBasis("VALUE");
      setProcedureLines([]);
    } else if (destination === "PROCEDURES" && procedureLines.length === 0) {
      setProcedureLines([{ procedureId: 0, value: 0 }]);
    } else if (destination === "MIXED" && procedureLines.length === 0) {
      setProcedureLines([{ procedureId: 0, value: 0 }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  const totalInput = useMemo(() => {
    const procedureSum = procedureLines.reduce((n, l) => n + (l.value || 0), 0);
    return destination === "GENERAL"
      ? amount
      : destination === "PROCEDURES"
        ? procedureSum
        : procedureSum + generalValue;
  }, [destination, procedureLines, generalValue, amount]);

  const expected = basis === "PERCENT" ? 100 : amount;
  const closesExactly = Math.round(totalInput * 100) === Math.round(expected * 100);

  function addProcedureLine() {
    setProcedureLines((lines) => [...lines, { procedureId: 0, value: 0 }]);
  }
  function removeProcedureLine(index: number) {
    setProcedureLines((lines) => lines.filter((_, i) => i !== index));
  }
  function updateProcedureLine(index: number, patch: Partial<ProcedureLine>) {
    setProcedureLines((lines) => lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function buildAllocations(): CreateExpenseInput["allocations"] {
    if (destination === "GENERAL") return [{ procedureId: null, value: amount }];
    if (destination === "PROCEDURES")
      return procedureLines.map((l) => ({ procedureId: l.procedureId, value: l.value }));
    return [
      { procedureId: null, value: generalValue },
      ...procedureLines.map((l) => ({ procedureId: l.procedureId, value: l.value })),
    ];
  }

  const valid =
    description.trim().length >= 2 &&
    amount > 0 &&
    allocationNote.trim().length >= 3 &&
    reason.trim().length >= 3 &&
    closesExactly &&
    (destination === "GENERAL" ||
      (procedureLines.length > 0 && procedureLines.every((l) => l.procedureId > 0)));

  function submit() {
    if (!valid || busy) return;
    onSubmit({
      description: description.trim(),
      category,
      supplier: supplier.trim() || null,
      amount,
      dueDate,
      competenceMonth,
      recurrence,
      destination,
      basis,
      allocations: buildAllocations(),
      allocationNote: allocationNote.trim(),
      reason: reason.trim(),
    });
  }

  return (
    <SidePanel
      eyebrow="Financeiro"
      title={title ?? "Nova despesa"}
      close={close}
      wide
      footer={
        <>
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button primary-button-link"
            disabled={!valid || busy}
            onClick={submit}
          >
            {busy ? "Salvando…" : "Salvar despesa"}
          </button>
        </>
      }
    >
      <div className="records-content">
        <div className="record-form">
          <label className="field">
            Descrição
            <input className="text-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <div className="field-grid">
            <label className="field">
              Categoria
              <select className="select-input" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Fornecedor · opcional
              <input className="text-input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              Valor total
              <input
                className="text-input"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              />
            </label>
            <label className="field">
              Vencimento
              <input className="text-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          </div>
          <div className="field-grid">
            <label className="field">
              Competência
              <input
                className="text-input"
                type="month"
                value={competenceMonth}
                onChange={(e) => setCompetenceMonth(e.target.value)}
              />
            </label>
            <label className="field">
              Recorrência
              <select className="select-input" value={recurrence} onChange={(e) => setRecurrence(e.target.value as ExpenseRecurrence)}>
                <option value="ONCE">Única</option>
                <option value="RECURRING">Recorrente</option>
              </select>
            </label>
          </div>

          <div className="expense-distribution">
            <span className="section-label">Destinação</span>
            <div className="segmented">
              {(["GENERAL", "PROCEDURES", "MIXED"] as ExpenseDestination[]).map((d) => (
                <button
                  type="button"
                  key={d}
                  className={destination === d ? "segmented-item is-active" : "segmented-item"}
                  onClick={() => setDestination(d)}
                >
                  {d === "GENERAL" ? "Geral da clínica" : d === "PROCEDURES" ? "Procedimentos" : "Misto"}
                </button>
              ))}
            </div>

            {destination !== "GENERAL" ? (
              <>
                <div className="segmented" style={{ marginTop: 12 }}>
                  {(["VALUE", "PERCENT"] as ExpenseBasis[]).map((b) => (
                    <button
                      type="button"
                      key={b}
                      className={basis === b ? "segmented-item is-active" : "segmented-item"}
                      onClick={() => setBasis(b)}
                    >
                      {b === "VALUE" ? "Por valor (R$)" : "Por percentual (%)"}
                    </button>
                  ))}
                </div>

                <div className="expense-allocation-lines">
                  {destination === "MIXED" ? (
                    <div className="expense-allocation-row">
                      <span className="section-meta">Parcela geral</span>
                      <input
                        className="text-input"
                        type="number"
                        min={0}
                        value={generalValue}
                        onChange={(e) => setGeneralValue(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                  ) : null}
                  {procedureLines.map((line, index) => (
                    <div className="expense-allocation-row" key={index}>
                      <select
                        className="select-input"
                        value={line.procedureId || ""}
                        onChange={(e) => updateProcedureLine(index, { procedureId: Number(e.target.value) })}
                      >
                        <option value="">Selecione o procedimento</option>
                        {procedures.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="text-input"
                        type="number"
                        min={0}
                        value={line.value}
                        onChange={(e) => updateProcedureLine(index, { value: Math.max(0, Number(e.target.value)) })}
                      />
                      <button type="button" className="text-button" onClick={() => removeProcedureLine(index)}>
                        Remover
                      </button>
                    </div>
                  ))}
                  <button type="button" className="secondary-button" onClick={addProcedureLine}>
                    + Adicionar procedimento
                  </button>
                </div>

                <p className={closesExactly ? "section-meta" : "expense-allocation-warning"}>
                  {basis === "PERCENT"
                    ? `Soma atual: ${totalInput.toFixed(2)}% (precisa fechar 100%)`
                    : `Soma atual: ${formatPrice(totalInput)} (precisa fechar ${formatPrice(amount)})`}
                </p>
              </>
            ) : null}

            <label className="field">
              Critério/observação da distribuição
              <textarea
                className="text-input"
                rows={2}
                value={allocationNote}
                onChange={(e) => setAllocationNote(e.target.value)}
              />
            </label>
          </div>

          <label className="field">
            Motivo {initial ? "da revisão" : "do lançamento"}
            <textarea className="text-input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </div>
      </div>
    </SidePanel>
  );
}
