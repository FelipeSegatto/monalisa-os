import { ApplicationError } from "../../shared/domain/application-error";
import { Money, allocate } from "./money";
import { Discount, DiscountInput } from "./discount";
export interface ResolvedSaleItem {
  procedureId: number;
  variationId: number | null;
  description: string;
  variationName: string | null;
  sessions: number;
  unitPrice: number;
  referenceCents: number;
  promotionalCents: number;
  offeredCents: number;
  discount?: DiscountInput;
  expiresAt: Date | null;
  purchaseIndex: number | null;
}
export interface SaleLine {
  offerVersionId?: number;
  quantity?: number;
  procedureId?: number;
  variationId?: number | null;
  sessions?: number;
  discount?: DiscountInput;
  sessionValidityDays?: number | null;
}
export interface SaleInput {
  customerId: number;
  professionalId?: number | null;
  commissionPercent?: number | null;
  allowUnpaidUse: boolean;
  requestKey: string;
  lines: SaleLine[];
  discount?: DiscountInput;
  initialPayment?: {
    amount: number;
    method: "PIX" | "CASH" | "CARD";
    installments?: number | null;
  } | null;
  receivables?: { amount: number; dueOn: string }[];
}
export class Sale {
  private constructor(
    readonly items: (ResolvedSaleItem & {
      lineDiscountCents: number;
      finalCents: number;
      globalDiscountCents: number;
      netCents: number;
    })[],
    readonly globalDiscountCents: number,
    readonly totalCents: number,
  ) {}
  static confirm(items: ResolvedSaleItem[], discount?: DiscountInput) {
    if (!items.length || items.length > 500)
      throw new ApplicationError(
        "Venda sem itens ou acima do limite",
        "INVALID_INPUT",
      );
    const lines = items.map((i) => {
      Money.ofCents(i.referenceCents);
      Money.ofCents(i.promotionalCents);
      Money.ofCents(i.offeredCents);
      if (
        i.referenceCents - i.promotionalCents !== i.offeredCents ||
        Money.from(i.unitPrice).times(i.sessions).cents !== i.referenceCents
      )
        throw new ApplicationError(
          "Composição financeira do item inválida",
          "INVALID_INPUT",
        );
      const d = Discount.calculate(i.offeredCents, i.discount);
      return { ...i, lineDiscountCents: d, finalCents: i.offeredCents - d };
    });
    const subtotal = lines.reduce((n, i) => n + i.finalCents, 0);
    Money.ofCents(subtotal);
    const global = Discount.calculate(subtotal, discount),
      shares = allocate(
        global,
        lines.map((i) => i.finalCents),
      );
    return new Sale(
      lines.map((i, index) => ({
        ...i,
        globalDiscountCents: shares[index],
        netCents: i.finalCents - shares[index],
      })),
      global,
      subtotal - global,
    );
  }
  assertPayment(amount: number, alreadyPaid = 0) {
    const p = Money.from(amount).cents;
    if (p <= 0 || p + alreadyPaid > this.totalCents)
      throw new ApplicationError(
        "Pagamento supera o saldo devedor ou é inválido",
        "CONFLICT",
      );
  }
  static assertPayment(total: number, received: number, amount: number) {
    const delta = Money.from(amount).cents;
    if (!delta || delta + received > total)
      throw new ApplicationError(
        "Pagamento supera o saldo devedor",
        "CONFLICT",
      );
  }
  static assertCancellation(received: number, used: number, reserved: number) {
    if (received || used || reserved)
      throw new ApplicationError(
        "Estorne pagamentos e utilizações e libere reservas antes de cancelar",
        "CONFLICT",
      );
  }
}
