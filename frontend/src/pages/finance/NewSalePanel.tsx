import { useEffect, useState } from "react";
import { SidePanel } from "../../components/SidePanel";
import { CustomerSearchSelect } from "../../components/CustomerSearchSelect";
import {
  getCustomers,
  getProcedureCategories,
  getProfessionals,
  type CreateSaleInput,
  type CurrentUser,
  type CustomerListItem,
  type PaymentMethod,
  type Procedure,
  type ProfessionalDetail,
} from "../../lib/api";
import { formatPrice } from "../../lib/format";

interface DraftItem {
  key: number;
  procedureId: number;
  variationId: number | null;
  sessions: number;
  unitPrice: number;
  finalPrice: number;
}

let nextKey = 1;

function makeItem(procedure: Procedure | undefined): DraftItem {
  if (!procedure) {
    return { key: nextKey++, procedureId: 0, variationId: null, sessions: 1, unitPrice: 0, finalPrice: 0 };
  }
  const activeVariations = procedure.variations.filter((v) => v.active);
  const variation = activeVariations.at(-1) ?? null;
  const price = variation ? variation.price : procedure.price;
  return {
    key: nextKey++,
    procedureId: procedure.id,
    variationId: variation?.id ?? null,
    sessions: 1,
    unitPrice: price,
    finalPrice: price,
  };
}

interface Props {
  close: () => void;
  save: (input: CreateSaleInput) => void;
  saving: boolean;
  currentUser: CurrentUser | null;
}

export function NewSalePanel({ close, save, saving, currentUser }: Props) {
  const lockedProfessionalId =
    currentUser?.role === "FUNCIONARIO" ? currentUser.professionalId : null;

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDetail[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  const [customerId, setCustomerId] = useState<number | "">("");
  const [professionalId, setProfessionalId] = useState<number | "">(lockedProfessionalId ?? "");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [withCommission, setWithCommission] = useState(false);
  const [commission, setCommission] = useState(10);

  const [paymentType, setPaymentType] = useState<"INTEGRAL" | "PARCIAL" | "DEPOIS">("PARCIAL");
  const [paidNow, setPaidNow] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [installments, setInstallments] = useState(1);

  useEffect(() => {
    getCustomers({}).then(setCustomers).catch(() => undefined);
    getProfessionals().then(setProfessionals).catch(() => undefined);
    getProcedureCategories()
      .then((categories) => {
        const flat = categories.flatMap((c) => c.procedures).filter((p) => p.active);
        setProcedures(flat);
        if (flat.length > 0) {
          setItems([makeItem(flat[0])]);
        }
      })
      .catch(() => undefined);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.finalPrice, 0);
  const total = Math.max(0, subtotal - Math.max(0, discount));
  const payment =
    paymentType === "DEPOIS" ? 0 : paymentType === "INTEGRAL" ? total : Math.min(total, Math.max(0, paidNow));

  function updateItem(key: number, patch: Partial<DraftItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function procedureFor(item: DraftItem): Procedure | undefined {
    return procedures.find((p) => p.id === item.procedureId);
  }

  function chooseProcedure(key: number, procedureId: number) {
    const procedure = procedures.find((p) => p.id === procedureId);
    const fresh = makeItem(procedure);
    updateItem(key, { ...fresh, key });
  }

  function chooseVariation(key: number, variationId: number) {
    const item = items.find((i) => i.key === key);
    const procedure = item ? procedureFor(item) : undefined;
    const variation = procedure?.variations.find((v) => v.id === variationId);
    if (!variation) return;
    const value = variation.price * (item?.sessions ?? 1);
    updateItem(key, { variationId, unitPrice: variation.price, finalPrice: value });
  }

  function handleSave() {
    if (!customerId || items.length === 0) return;
    const input: CreateSaleInput = {
      customerId,
      professionalId: professionalId || null,
      discount: Math.max(0, discount),
      commissionPercent: withCommission ? commission : null,
      items: items.map((item) => {
        const procedure = procedureFor(item);
        const variation = procedure?.variations.find((v) => v.id === item.variationId);
        return {
          procedureId: item.procedureId,
          procedurePriceVariationId: item.variationId,
          description: `${procedure?.name ?? ""}${variation ? ` · ${variation.name}` : item.sessions > 1 ? ` · ${item.sessions} sessões` : ""}`,
          sessions: item.sessions,
          unitPrice: item.unitPrice,
          finalPrice: item.finalPrice,
        };
      }),
      initialPayment:
        payment > 0
          ? { amount: payment, method, installments: method === "CARD" ? installments : null }
          : null,
    };
    save(input);
  }

  return (
    <SidePanel
      eyebrow="Financeiro"
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
            className="primary-button primary-button-link"
            disabled={!customerId || items.length === 0 || saving}
            onClick={handleSave}
          >
            {saving ? "Salvando…" : "Concluir venda"}
          </button>
        </>
      }
    >
      <div className="panel-section">
        <div className="section-header">
          <span className="section-label">Venda</span>
        </div>
        <div className="record-form">
          <label className="field">
            Cliente
            <CustomerSearchSelect customers={customers} value={customerId} onChange={setCustomerId} />
          </label>
          <label className="field">
            Profissional
            {lockedProfessionalId !== null ? (
              <input
                className="text-input"
                disabled
                value={
                  professionals.find((p) => p.id === lockedProfessionalId)?.name ?? "Você"
                }
              />
            ) : (
              <select
                className="select-input"
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">Sem profissional</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="field inline-choice">
            <input
              className="inline-checkbox"
              type="checkbox"
              checked={withCommission}
              onChange={(e) => setWithCommission(e.target.checked)}
            />
            Adicionar comissão
          </label>
          {withCommission ? (
            <label className="field">
              Comissão (%)
              <input
                className="text-input"
                type="number"
                min={0}
                value={commission}
                onChange={(e) => setCommission(Number(e.target.value))}
              />
            </label>
          ) : null}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-header">
          <span className="section-label">Itens</span>
          <button
            type="button"
            className="text-button"
            onClick={() => setItems((current) => [...current, makeItem(procedures[0])])}
          >
            + Adicionar item
          </button>
        </div>
        <div className="sale-items">
          {items.map((item) => {
            const procedure = procedureFor(item);
            const activeVariations = procedure?.variations.filter((v) => v.active) ?? [];
            return (
              <div className="sale-item" key={item.key}>
                <div className="field-grid">
                  <label className="field">
                    Procedimento
                    <select
                      className="select-input"
                      value={item.procedureId}
                      onChange={(e) => chooseProcedure(item.key, Number(e.target.value))}
                    >
                      {procedures.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {activeVariations.length > 0 ? (
                    <label className="field">
                      Variação
                      <select
                        className="select-input"
                        value={item.variationId ?? ""}
                        onChange={(e) => chooseVariation(item.key, Number(e.target.value))}
                      >
                        {activeVariations.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="field">
                      Sessões
                      <input
                        className="text-input"
                        type="number"
                        min={1}
                        value={item.sessions}
                        onChange={(e) => {
                          const sessions = Math.max(1, Number(e.target.value));
                          updateItem(item.key, {
                            sessions,
                            finalPrice: item.unitPrice * sessions,
                          });
                        }}
                      />
                    </label>
                  )}
                </div>
                <div className="field-grid">
                  <label className="field">
                    Preço cadastrado
                    <input className="text-input" disabled value={formatPrice(item.unitPrice)} />
                  </label>
                  <label className="field">
                    Preço final
                    <input
                      className="text-input"
                      type="number"
                      min={0}
                      value={item.finalPrice}
                      onChange={(e) =>
                        updateItem(item.key, { finalPrice: Math.max(0, Number(e.target.value)) })
                      }
                    />
                  </label>
                </div>
                {items.length > 1 ? (
                  <button
                    type="button"
                    className="text-button is-danger"
                    onClick={() => setItems((current) => current.filter((i) => i.key !== item.key))}
                  >
                    Remover item
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="sale-totals">
          <div>
            <span>Subtotal</span>
            <b>{formatPrice(subtotal)}</b>
          </div>
          <label>
            Desconto
            <input
              className="text-input"
              type="number"
              min={0}
              max={subtotal}
              value={discount}
              onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, Number(e.target.value))))}
            />
          </label>
          <div className="total">
            <span>Total final</span>
            <b className="display">{formatPrice(total)}</b>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-header">
          <span className="section-label">Pagamento</span>
        </div>
        <div className="record-form">
          <label className="field">
            Pagamento
            <select
              className="select-input"
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as "INTEGRAL" | "PARCIAL" | "DEPOIS")}
            >
              <option value="INTEGRAL">Integral</option>
              <option value="PARCIAL">Parcial</option>
              <option value="DEPOIS">Registrar depois</option>
            </select>
          </label>
          {paymentType !== "DEPOIS" ? (
            <>
              <div className="field-grid">
                <label className="field">
                  Valor pago agora
                  <input
                    className="text-input"
                    type="number"
                    min={0}
                    max={total}
                    disabled={paymentType === "INTEGRAL"}
                    value={payment}
                    onChange={(e) => setPaidNow(Number(e.target.value))}
                  />
                </label>
                <label className="field">
                  Forma
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
              </div>
              {method === "CARD" ? (
                <label className="field">
                  Parcelas
                  <select
                    className="select-input"
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((value) => (
                      <option key={value} value={value}>
                        {value}x
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}
          <div className="payment-preview">
            <div>
              <span>Recebido</span>
              <b>{formatPrice(payment)}</b>
            </div>
            <div>
              <span>A receber</span>
              <b>{formatPrice(total - payment)}</b>
            </div>
            <span className={payment === total && total > 0 ? "active-badge is-active" : "active-badge"}>
              {payment === total && total > 0 ? "Paga" : payment > 0 ? "Parcialmente paga" : "Pendente"}
            </span>
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
