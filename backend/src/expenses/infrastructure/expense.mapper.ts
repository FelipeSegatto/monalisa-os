export function viewExpense(x: any) {
  const activePayment = (x.payments ?? []).find(
    (p: any) => p.type === "PAYMENT" && !p.reversal,
  );
  const latestRevision = (x.revisions ?? [])[0] ?? null;
  const historicalPending =
    x.expenseModel === "LEGACY" &&
    (x.destination == null ||
      x.category == null ||
      x.competenceMonth == null);
  return {
    id: x.id,
    expenseModel: x.expenseModel,
    description: x.description,
    category: x.category,
    supplier: x.supplier,
    amount: Number(x.amount),
    dueDate: x.dueDate ? x.dueDate.toISOString().slice(0, 10) : null,
    competenceMonth: x.competenceMonth,
    recurrence: x.recurrence,
    cancelled: x.cancelled,
    paid: Boolean(activePayment) || (x.expenseModel === "LEGACY" && x.paid),
    allocationRevision: x.allocationRevision,
    historicalPending,
    createdAt: x.createdAt ? x.createdAt.toISOString() : null,
    destination: latestRevision?.destination ?? null,
    basis: latestRevision?.basis ?? null,
    allocationNote: latestRevision?.allocationNote ?? null,
    allocations: latestRevision
      ? (latestRevision.allocations ?? []).map((a: any) => ({
          id: a.id,
          procedureId: a.procedureId,
          procedureName: a.procedureName,
          inputValue: Number(a.inputValue),
          amount: Number(a.amount),
        }))
      : [],
    revisions: (x.revisions ?? []).map((r: any) => ({
      id: r.id,
      version: r.version,
      description: r.description,
      category: r.category,
      supplier: r.supplier,
      amount: Number(r.amount),
      dueDate: r.dueDate.toISOString().slice(0, 10),
      competenceMonth: r.competenceMonth,
      recurrence: r.recurrence,
      destination: r.destination,
      basis: r.basis,
      allocationNote: r.allocationNote,
      reason: r.reason,
      actorId: r.actorId,
      createdAt: r.createdAt.toISOString(),
      allocations: (r.allocations ?? []).map((a: any) => ({
        id: a.id,
        procedureId: a.procedureId,
        procedureName: a.procedureName,
        inputValue: Number(a.inputValue),
        amount: Number(a.amount),
      })),
    })),
    payments: (x.payments ?? []).map((p: any) => ({
      id: p.id,
      type: p.type,
      source: p.source,
      amount: Number(p.amount),
      method: p.method,
      occurredAt: p.occurredAt ? p.occurredAt.toISOString() : null,
      actorId: p.actorId,
      reason: p.reason,
      reversesId: p.reversesId,
      reversed: Boolean(p.reversal),
      createdAt: p.createdAt.toISOString(),
    })),
    events: (x.events ?? []).map((e: any) => ({
      id: e.id,
      type: e.type,
      reason: e.reason,
      actorId: e.actorId,
      details: e.details,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}
