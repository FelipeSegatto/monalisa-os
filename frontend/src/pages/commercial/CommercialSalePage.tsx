import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { type CurrentUser, type PaymentMethod } from "../../lib/api";
import { formatPrice } from "../../lib/format";
import { PaymentPanel } from "../finance/PaymentPanel";
import { CommercialNav } from "./CommercialNav";
import { EntitlementsSection } from "./EntitlementsSection";
import {
  getCommercialSale,
  payCommercialSale,
  reverseCommercialPayment,
  cancelCommercialSale,
  reverseRedemption,
  saleStatusLabels,
  type CommercialSale,
} from "./api";
const eventLabels: Record<string, string> = {
  SALE_CONFIRMED: "Venda confirmada",
  PAYMENT_RECEIVED: "Pagamento recebido",
  PAYMENT_REVERSED: "Pagamento estornado",
  SALE_CANCELLED: "Venda cancelada",
  SESSION_RESERVED: "Sessão reservada",
  SESSION_RELEASED: "Reserva de sessão liberada",
  SESSION_REVERSED: "Utilização de sessão estornada",
};
export function CommercialSalePage() {
  const { id } = useParams(),
    user = useOutletContext<CurrentUser>();
  const [sale, setSale] = useState<CommercialSale | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [payment, setPayment] = useState(false),
    [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setSale(null);
    getCommercialSale(Number(id))
      .then((s) => {
        if (!cancelled) setSale(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  async function receive(
    amount: number,
    method: PaymentMethod,
    installments: number | null,
    key: string,
  ) {
    if (!sale) return;
    setBusy(true);
    setError("");
    try {
      setSale(
        await payCommercialSale(sale.id, {
          amount,
          method,
          installments,
          requestKey: key,
        }),
      );
      setPayment(false);
      setReloadToken((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível receber.");
    } finally {
      setBusy(false);
    }
  }
  async function action(
    kind: "CANCEL" | "PAYMENT" | "SESSION",
    target: number,
  ) {
    const reason = window.prompt(
      kind === "CANCEL"
        ? "Motivo do cancelamento"
        : kind === "PAYMENT"
          ? "Motivo do estorno do pagamento"
          : "Motivo da devolução da sessão ao saldo",
    );
    if (!reason || !sale) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "CANCEL")
        setSale(await cancelCommercialSale(target, reason));
      else if (kind === "PAYMENT")
        setSale(
          await reverseCommercialPayment(target, reason, crypto.randomUUID()),
        );
      else {
        await reverseRedemption(target, reason, crypto.randomUUID());
        setSale(await getCommercialSale(sale.id));
      }
      setReloadToken((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header-eyebrow">Comercial</p>
          <h1 className="page-header-title">Venda #{id}</h1>
        </div>
        {sale && !sale.cancelled && sale.balance > 0 && (
          <button
            type="button"
            className="primary-button"
            disabled={busy}
            onClick={() => setPayment(true)}
          >
            Registrar pagamento
          </button>
        )}
      </header>
      <CommercialNav />
      <Link className="back-link" to="/comercial/vendas">
        ← Todas as vendas
      </Link>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!sale && !error && <p>Carregando…</p>}
      {sale && (
        <>
          <p>
            <Link to={`/clientes/${sale.customerId}`}>{sale.customerName}</Link>{" "}
            · {saleStatusLabels[sale.status]} ·{" "}
            {new Date(sale.createdAt).toLocaleString("pt-BR")}
          </p>
          <p className="section-meta">
            {sale.professionalName
              ? `Responsável comercial: ${sale.professionalName}. `
              : ""}
            {sale.commercialModel === "LEGACY"
              ? ""
              : sale.allowUnpaidUse
                ? "Sessões autorizadas antes da quitação."
                : "Sessões liberadas após a quitação."}
          </p>
          {sale.commercialModel === "LEGACY" && (
            <p className="section-meta">
              Venda anterior ao novo comercial. Não foram criados direitos de
              sessão nem motivos de desconto retroativos.
            </p>
          )}
          {sale.offerPurchases.map((p) => (
            <p key={p.id}>
              Oferta contratada:{" "}
              <Link to={`/comercial/ofertas/${p.version.offerId}`}>
                {p.offerName}
              </Link>{" "}
              · versão {p.version.version} · {p.quantity} pacote(s)
            </p>
          ))}
          <div className="section-header">
            <span className="section-label">Condições contratadas</span>
          </div>
          <div className="commercial-cards">
            {sale.items.map((i) => (
              <article className="commercial-card" key={i.id}>
                <h2>{i.description}</h2>
                <p>
                  {i.sessions} sessões · Referência unitária{" "}
                  {formatPrice(i.unitPrice)}
                </p>
                {i.referenceAmount !== null && (
                  <p>
                    Referência total: {formatPrice(i.referenceAmount)}
                    <br />
                    Condição promocional: −
                    {formatPrice(i.promotionalDiscount ?? 0)}
                    <br />
                    Descontos negociados alocados: −
                    {formatPrice(i.negotiatedDiscount ?? 0)}
                  </p>
                )}
                <p>
                  <strong>
                    Valor líquido: {formatPrice(i.netAmount ?? i.finalPrice)}
                  </strong>
                </p>
                <Link to={`/procedimentos/${i.procedureId}`}>
                  Ver procedimento →
                </Link>
              </article>
            ))}
          </div>
          <div className="commercial-totals">
            <p>
              <span>Subtotal após condições dos itens</span>
              <b>{formatPrice(sale.subtotal)}</b>
            </p>
            <p>
              <span>Desconto adicional na venda</span>
              <b>−{formatPrice(sale.discount)}</b>
            </p>
            <p>
              <span>Total contratado</span>
              <b>{formatPrice(sale.total)}</b>
            </p>
            <p>
              <span>Recebido, após estornos</span>
              <b>{formatPrice(sale.received)}</b>
            </p>
            <p>
              <span>Saldo a receber</span>
              <b>{formatPrice(sale.balance)}</b>
            </p>
          </div>
          <div className="section-header">
            <span className="section-label">Histórico dos descontos</span>
          </div>
          {sale.discountRecords.length === 0 && (
            <p className="section-meta">
              Sem descontos registrados neste modelo.
            </p>
          )}
          <ul className="commercial-history">
            {sale.discountRecords.map((d) => (
              <li key={d.id}>
                <strong>
                  {d.kind === "PROMOTIONAL"
                    ? "Condição da oferta"
                    : "Desconto negociado"}{" "}
                  · {formatPrice(d.amount)}
                </strong>
                <p>
                  {d.scope === "SALE" ? "Venda inteira" : `Item #${d.itemId}`} ·
                  Base {formatPrice(d.baseAmount)} ·{" "}
                  {d.type === "PERCENT" ? `${d.value}%` : formatPrice(d.value)}
                </p>
                <p>
                  {d.reason} · Responsável #{d.actorId} ·{" "}
                  {new Date(d.createdAt).toLocaleString("pt-BR")}
                </p>
              </li>
            ))}
          </ul>
          <div className="section-header">
            <span className="section-label">Pagamentos</span>
          </div>
          {sale.payments.length === 0 && <p>Nenhum pagamento registrado.</p>}
          {sale.payments.map((p) => (
            <article className="commercial-line" key={p.id}>
              <p>
                {formatPrice(p.amount)} ·{" "}
                {p.method === "CASH"
                  ? "Dinheiro"
                  : p.method === "CARD"
                    ? "Cartão"
                    : "PIX"}
                {p.installments ? ` · ${p.installments}x no cartão` : ""} ·{" "}
                {new Date(p.paidAt).toLocaleString("pt-BR")} · Responsável{" "}
                {p.actorId
                  ? `#${p.actorId}`
                  : "não registrado no histórico anterior"}
              </p>
              {p.reversal ? (
                <p>
                  Estornado: {p.reversal.reason} · Responsável #
                  {p.reversal.actorId} ·{" "}
                  {new Date(p.reversal.createdAt).toLocaleString("pt-BR")}
                </p>
              ) : (
                user.role === "ADMIN" && (
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => action("PAYMENT", p.id)}
                  >
                    Estornar pagamento com motivo
                  </button>
                )
              )}
            </article>
          ))}
          <div className="section-header">
            <span className="section-label">
              Vencimentos combinados com a clínica
            </span>
          </div>
          <div className="commercial-scroll">
            <table className="commercial-table">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Recebido</th>
                  <th>Pendente</th>
                </tr>
              </thead>
              <tbody>
                {sale.receivables.map((r) => (
                  <tr key={r.id}>
                    <td>{r.number}</td>
                    <td>{r.dueOn}</td>
                    <td>{formatPrice(r.amount)}</td>
                    <td>{formatPrice(r.paid)}</td>
                    <td>{formatPrice(r.amount - r.paid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <EntitlementsSection
            customerId={sale.customerId}
            reloadToken={reloadToken}
          />
          <div className="section-header">
            <span className="section-label">
              Utilizações de sessões desta venda
            </span>
          </div>
          {sale.entitlements.flatMap((e) =>
            e.redemptions.map((r) => (
              <p key={r.id}>
                {e.description} ·{" "}
                {r.quantityDelta === 1
                  ? "Sessão utilizada"
                  : "Utilização estornada"}{" "}
                · {new Date(r.createdAt).toLocaleString("pt-BR")} · Responsável
                #{r.actorId}
                {r.reason ? " · " + r.reason : ""}{" "}
                {r.quantityDelta === 1 &&
                  !r.reversal &&
                  user.role === "ADMIN" && (
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => action("SESSION", r.id)}
                    >
                      Devolver sessão ao saldo com motivo
                    </button>
                  )}
              </p>
            )),
          )}
          <div className="section-header">
            <span className="section-label">Histórico da venda</span>
          </div>
          <ul className="commercial-history">
            {sale.events.map((e) => (
              <li key={e.id}>
                {eventLabels[e.type] ?? "Movimentação comercial"} ·{" "}
                {new Date(e.createdAt).toLocaleString("pt-BR")} · Responsável #
                {e.actorId}
                {e.reason ? " · " + e.reason : ""}
              </li>
            ))}
          </ul>
          {user.role === "ADMIN" && !sale.cancelled && (
            <div className="commercial-actions">
              <button
                type="button"
                className="secondary-button"
                disabled={busy}
                onClick={() => action("CANCEL", sale.id)}
              >
                Cancelar venda com motivo
              </button>
              <span className="section-meta">
                Requer estorno dos recebimentos e utilizações e liberação de
                reservas.
              </span>
            </div>
          )}
          {payment && (
            <PaymentPanel
              balance={sale.balance}
              saving={busy}
              close={() => setPayment(false)}
              save={receive}
            />
          )}
        </>
      )}
    </div>
  );
}
