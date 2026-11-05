import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { CustomerSearchSelect } from "../../components/CustomerSearchSelect";
import {
  getCustomers,
  getProfessionals,
  getProcedureCategories,
  type CurrentUser,
  type CustomerListItem,
  type ProfessionalDetail,
  type Procedure,
  type PaymentMethod,
} from "../../lib/api";
import { formatPrice } from "../../lib/format";
import {
  getOffers,
  createCommercialSale,
  type CommercialSale,
  type CommercialSaleInput,
  type Offer,
  type DiscountInput,
} from "./api";
interface Line {
  key: string;
  kind: "OFFER" | "CUSTOM";
  offerVersionId: number;
  quantity: number;
  procedureId: number;
  variationId: number | null;
  sessions: number;
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
  discountReason: string;
  validity: string;
}
const fresh = (): Line => ({
  key: crypto.randomUUID(),
  kind: "OFFER",
  offerVersionId: 0,
  quantity: 1,
  procedureId: 0,
  variationId: null,
  sessions: 1,
  discountType: "FIXED",
  discountValue: 0,
  discountReason: "",
  validity: "",
});
export function SaleComposer({
  user,
  customerDefault,
  close,
  onSaved,
}: {
  user: CurrentUser;
  customerDefault?: number;
  close: () => void;
  onSaved: (sale: CommercialSale) => void;
}) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]),
    [professionals, setProfessionals] = useState<ProfessionalDetail[]>([]),
    [procedures, setProcedures] = useState<Procedure[]>([]),
    [offers, setOffers] = useState<Offer[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState<number | "">(
      customerDefault ?? "",
    ),
    [professionalId, setProfessionalId] = useState<number | "">(
      user.professionalId ?? "",
    ),
    [lines, setLines] = useState<Line[]>([fresh()]);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">(
      "FIXED",
    ),
    [discountValue, setDiscountValue] = useState(0),
    [reason, setReason] = useState(""),
    [allowUnpaid, setAllowUnpaid] = useState(false),
    [paid, setPaid] = useState(0),
    [method, setMethod] = useState<PaymentMethod>("PIX"),
    [cardInstallments, setCardInstallments] = useState(1),
    [customPlan, setCustomPlan] = useState(false),
    [plan, setPlan] = useState<{ amount: number; dueOn: string }[]>([]),
    [key] = useState(() => crypto.randomUUID());
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCustomers({}),
      getProfessionals(),
      getProcedureCategories(),
      getOffers(),
    ])
      .then(([c, p, categories, o]) => {
        if (cancelled) return;
        setCustomers(c);
        setProfessionals(p);
        setProcedures(
          categories.flatMap((c) => c.procedures).filter((p) => p.active),
        );
        setOffers(o.offers.filter((o) => o.effectiveVersionId !== null));
        setLoading(false);
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
  }, []);
  function change(key: string, patch: Partial<Line>) {
    setLines((lines) =>
      lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }
  const effective = offers.flatMap((o) =>
    o.versions.filter((v) => v.id === o.effectiveVersionId),
  );
  const base = (l: Line) => {
    if (l.kind === "OFFER")
      return (
        (effective.find((v) => v.id === l.offerVersionId)?.price ?? 0) *
        l.quantity
      );
    const p = procedures.find((p) => p.id === l.procedureId),
      v = p?.variations.find((v) => v.id === l.variationId);
    return (v?.price ?? p?.price ?? 0) * l.sessions;
  };
  const reduction = (base: number, type: "FIXED" | "PERCENT", value: number) =>
    Math.round((type === "PERCENT" ? (base * value) / 100 : value) * 100) / 100;
  const subtotal = lines.reduce(
      (n, l) =>
        n +
        base(l) -
        (l.kind === "CUSTOM"
          ? reduction(base(l), l.discountType, l.discountValue)
          : 0),
      0,
    ),
    discount = reduction(subtotal, discountType, discountValue),
    total = Math.round((subtotal - discount) * 100) / 100,
    balance = Math.round((total - paid) * 100) / 100;
  const discountInput = (
    type: "FIXED" | "PERCENT",
    value: number,
    reason: string,
  ): DiscountInput | undefined =>
    value > 0 ? { type, value, reason } : undefined;
  async function save() {
    if (!customerId) {
      setError("Selecione o cliente.");
      return;
    }
    setSaving(true);
    setError("");
    const input: CommercialSaleInput = {
      customerId,
      professionalId: professionalId || null,
      allowUnpaidUse: allowUnpaid,
      requestKey: key,
      lines: lines.map((l) =>
        l.kind === "OFFER"
          ? { offerVersionId: l.offerVersionId, quantity: l.quantity }
          : {
              procedureId: l.procedureId,
              variationId: l.variationId,
              sessions: l.sessions,
              sessionValidityDays: l.validity ? Number(l.validity) : null,
              discount: discountInput(
                l.discountType,
                l.discountValue,
                l.discountReason,
              ),
            },
      ),
      discount: discountInput(discountType, discountValue, reason),
      initialPayment:
        paid > 0
          ? {
              amount: paid,
              method,
              installments: method === "CARD" ? cardInstallments : null,
            }
          : null,
      ...(customPlan ? { receivables: plan } : {}),
    };
    try {
      onSaved(await createCommercialSale(input));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível confirmar.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <SidePanel
      eyebrow="Comercial"
      title="Nova venda"
      close={close}
      wide
      footer={
        <>
          <button type="button" className="secondary-button" onClick={close}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving || loading}
            onClick={save}
          >
            {saving ? "Confirmando…" : "Confirmar venda"}
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
          {loading && <p>Carregando…</p>}
          <label className="field">
            Cliente
            <CustomerSearchSelect
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
            />
          </label>
          {user.role === "ADMIN" && (
            <label className="field">
              Profissional responsável pela venda
              <select
                className="select-input"
                value={professionalId}
                onChange={(e) =>
                  setProfessionalId(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
              >
                <option value="">Sem profissional vinculado</option>
                {professionals
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {lines.map((l, index) => {
            const p = procedures.find((p) => p.id === l.procedureId),
              v = effective.find((v) => v.id === l.offerVersionId);
            return (
              <section className="commercial-line" key={l.key}>
                <h3>Item {index + 1}</h3>
                <label className="field">
                  Tipo
                  <select
                    className="select-input"
                    value={l.kind}
                    onChange={(e) =>
                      change(l.key, { kind: e.target.value as Line["kind"] })
                    }
                  >
                    <option value="OFFER">Oferta ou combo</option>
                    <option value="CUSTOM">Procedimento avulso</option>
                  </select>
                </label>
                {l.kind === "OFFER" ? (
                  <>
                    <label className="field">
                      Oferta disponível
                      <select
                        className="select-input"
                        value={l.offerVersionId || ""}
                        onChange={(e) =>
                          change(l.key, {
                            offerVersionId: Number(e.target.value),
                          })
                        }
                      >
                        <option value="">Selecione…</option>
                        {effective.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} · v{v.version} · {formatPrice(v.price)}
                          </option>
                        ))}
                      </select>
                    </label>
                    {v && (
                      <p className="section-meta">
                        {v.items
                          .map(
                            (i) =>
                              `${i.procedureName}${i.variationName ? " · " + i.variationName : ""}: ${i.sessions} sessões`,
                          )
                          .join(" + ")}
                      </p>
                    )}
                    <label className="field">
                      Quantidade de pacotes
                      <input
                        className="text-input"
                        type="number"
                        min="1"
                        max="100"
                        value={l.quantity}
                        onChange={(e) =>
                          change(l.key, { quantity: Number(e.target.value) })
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field">
                      Procedimento
                      <select
                        className="select-input"
                        value={l.procedureId || ""}
                        onChange={(e) =>
                          change(l.key, {
                            procedureId: Number(e.target.value),
                            variationId: null,
                          })
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
                    <label className="field">
                      Área ou opção
                      <select
                        className="select-input"
                        value={l.variationId ?? ""}
                        onChange={(e) =>
                          change(l.key, {
                            variationId: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                      >
                        <option value="">
                          {p?.variations.some((v) => v.active)
                            ? "Selecione…"
                            : "Sem opção específica"}
                        </option>
                        {p?.variations
                          .filter((v) => v.active)
                          .map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.groupName ? `${v.groupName} · ` : ""}
                              {v.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="field-grid">
                      <label className="field">
                        Sessões
                        <input
                          className="text-input"
                          type="number"
                          min="1"
                          max="1000"
                          value={l.sessions}
                          onChange={(e) =>
                            change(l.key, { sessions: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label className="field">
                        Prazo para utilizar, em dias (opcional)
                        <input
                          className="text-input"
                          type="number"
                          min="1"
                          max="3650"
                          value={l.validity}
                          onChange={(e) =>
                            change(l.key, { validity: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="field-grid">
                      <label className="field">
                        Desconto no item
                        <select
                          className="select-input"
                          value={l.discountType}
                          onChange={(e) =>
                            change(l.key, {
                              discountType: e.target
                                .value as Line["discountType"],
                            })
                          }
                        >
                          <option value="FIXED">Valor em reais</option>
                          <option value="PERCENT">Percentual</option>
                        </select>
                      </label>
                      <label className="field">
                        Valor do desconto
                        <input
                          className="text-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.discountValue}
                          onChange={(e) =>
                            change(l.key, {
                              discountValue: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    {l.discountValue > 0 && (
                      <label className="field">
                        Motivo do desconto deste item
                        <input
                          className="text-input"
                          value={l.discountReason}
                          onChange={(e) =>
                            change(l.key, { discountReason: e.target.value })
                          }
                        />
                      </label>
                    )}
                  </>
                )}
                <p>Valor antes do desconto adicional: {formatPrice(base(l))}</p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setLines(lines.filter((i) => i.key !== l.key))}
                >
                  Remover item
                </button>
              </section>
            );
          })}
          <button
            type="button"
            className="secondary-button"
            onClick={() => setLines([...lines, fresh()])}
          >
            Adicionar item
          </button>
          <div className="field-grid">
            <label className="field">
              Desconto adicional na venda
              <select
                className="select-input"
                value={discountType}
                onChange={(e) =>
                  setDiscountType(e.target.value as "FIXED" | "PERCENT")
                }
              >
                <option value="FIXED">Valor em reais</option>
                <option value="PERCENT">Percentual</option>
              </select>
            </label>
            <label className="field">
              Desconto
              <input
                className="text-input"
                type="number"
                min="0"
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
            </label>
          </div>
          {discountValue > 0 && (
            <label className="field">
              Motivo do desconto adicional
              <input
                className="text-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          )}
          <div className="commercial-totals">
            <p>
              <span>Total previsto</span>
              <strong>{formatPrice(total)}</strong>
            </p>
          </div>
          <div className="section-header">
            <span className="section-label">Recebimento</span>
          </div>
          <label className="field">
            Valor recebido agora (zero = receber depois)
            <input
              className="text-input"
              type="number"
              min="0"
              step="0.01"
              value={paid}
              onChange={(e) => setPaid(Number(e.target.value))}
            />
          </label>
          {paid > 0 && (
            <>
              <label className="field">
                Forma de pagamento
                <select
                  className="select-input"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                >
                  <option value="PIX">PIX</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="CARD">Cartão</option>
                </select>
              </label>
              {method === "CARD" && (
                <label className="field">
                  Parcelas no cartão
                  <input
                    className="text-input"
                    type="number"
                    min="1"
                    max="48"
                    value={cardInstallments}
                    onChange={(e) =>
                      setCardInstallments(Number(e.target.value))
                    }
                  />
                </label>
              )}
            </>
          )}
          <p>Saldo previsto a receber: {formatPrice(balance)}</p>
          <label className="field">
            <span>
              <input
                type="checkbox"
                checked={customPlan}
                onChange={(e) => {
                  setCustomPlan(e.target.checked);
                  if (e.target.checked && !plan.length)
                    setPlan([
                      {
                        amount: Math.max(0, balance),
                        dueOn: new Date().toLocaleDateString("en-CA"),
                      },
                    ]);
                }}
              />{" "}
              Definir vencimentos combinados com a clínica
            </span>
          </label>
          {customPlan && (
            <>
              <p className="section-meta">
                As parcelas abaixo devem somar o saldo após a entrada. Parcelas
                do cartão não são parcelas devidas à clínica.
              </p>
              {plan.map((r, index) => (
                <div className="field-grid" key={index}>
                  <label className="field">
                    Valor da parcela {index + 1}
                    <input
                      className="text-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={r.amount}
                      onChange={(e) =>
                        setPlan(
                          plan.map((p, i) =>
                            i === index
                              ? { ...p, amount: Number(e.target.value) }
                              : p,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    Vencimento
                    <input
                      className="text-input"
                      type="date"
                      value={r.dueOn}
                      onChange={(e) =>
                        setPlan(
                          plan.map((p, i) =>
                            i === index ? { ...p, dueOn: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setPlan(plan.filter((_, i) => i !== index))}
                  >
                    Remover parcela
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setPlan([
                    ...plan,
                    {
                      amount: 0,
                      dueOn: new Date().toLocaleDateString("en-CA"),
                    },
                  ])
                }
              >
                Adicionar vencimento
              </button>
            </>
          )}
          {user.role === "ADMIN" && (
            <label className="field">
              <span>
                <input
                  type="checkbox"
                  checked={allowUnpaid}
                  onChange={(e) => setAllowUnpaid(e.target.checked)}
                />{" "}
                Autorizar sessões antes da quitação desta venda
              </span>
            </label>
          )}
          <p className="section-meta">
            Ao confirmar, preços, descontos e condições ficam preservados. As
            sessões são criadas para o cliente.
          </p>
        </div>
      </div>
    </SidePanel>
  );
}
