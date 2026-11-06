import { getJSON, sendJSON, type PaymentMethod } from "../../lib/api";
export interface OfferItem {
  id: number;
  procedureId: number;
  variationId: number | null;
  procedureName: string;
  variationName: string | null;
  sessions: number;
  referenceUnitPrice: number;
}
export interface OfferVersion {
  id: number;
  offerId: number;
  version: number;
  name: string;
  startsOn: string;
  endsOn: string | null;
  sessionValidityDays: number | null;
  price: number;
  referenceAmount: number;
  terms: string | null;
  actorId: number;
  createdAt: string;
  items: OfferItem[];
}
export interface CommercialEvent {
  id: number;
  type: string;
  reason: string | null;
  actorId: number;
  createdAt: string;
}
export interface Offer {
  id: number;
  name: string;
  active: boolean;
  status: "ACTIVE" | "UPCOMING" | "EXPIRED" | "PAUSED";
  effectiveVersionId: number | null;
  versions: OfferVersion[];
  events: CommercialEvent[];
}
export interface OfferInput {
  name: string;
  startsOn: string;
  endsOn: string | null;
  sessionValidityDays: number | null;
  price: number;
  terms: string | null;
  items: {
    procedureId: number;
    variationId: number | null;
    sessions: number;
  }[];
}
export interface DiscountInput {
  type: "FIXED" | "PERCENT";
  value: number;
  reason: string;
}
export interface CommercialSaleInput {
  customerId: number;
  professionalId: number | null;
  allowUnpaidUse: boolean;
  requestKey: string;
  lines: {
    offerVersionId?: number;
    quantity?: number;
    procedureId?: number;
    variationId?: number | null;
    sessions?: number;
    discount?: DiscountInput;
    sessionValidityDays?: number | null;
  }[];
  discount?: DiscountInput;
  initialPayment?: {
    amount: number;
    method: PaymentMethod;
    installments: number | null;
  } | null;
  receivables?: { amount: number; dueOn: string }[];
}
export interface Entitlement {
  id: number;
  saleId: number;
  saleItemId: number;
  procedureId: number;
  variationId: number | null;
  description: string;
  quantity: number;
  used: number;
  reserved: number;
  available: number;
  expiresAt: string | null;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED" | "AWAITING_PAYMENT";
}
export interface CommercialSale {
  id: number;
  customerId: number;
  customerName: string;
  professionalId: number | null;
  professionalName: string | null;
  actorId: number | null;
  commercialModel: string;
  cancelled: boolean;
  createdAt: string;
  confirmedAt: string | null;
  allowUnpaidUse: boolean | null;
  subtotal: number;
  discount: number;
  total: number;
  received: number;
  balance: number;
  status: "PAID" | "PARTIAL" | "PENDING" | "CANCELLED";
  items: {
    id: number;
    procedureId: number;
    variationId: number | null;
    description: string;
    sessions: number;
    unitPrice: number;
    finalPrice: number;
    referenceAmount: number | null;
    promotionalDiscount: number | null;
    negotiatedDiscount: number | null;
    netAmount: number | null;
  }[];
  offerPurchases: {
    id: number;
    offerName: string;
    quantity: number;
    version: { id: number; offerId: number; version: number };
  }[];
  payments: {
    id: number;
    amount: number;
    method: PaymentMethod;
    installments: number | null;
    paidAt: string;
    actorId: number | null;
    reversal: {
      id: number;
      reason: string;
      actorId: number;
      createdAt: string;
    } | null;
  }[];
  discountRecords: {
    id: number;
    itemId: number | null;
    kind: "PROMOTIONAL" | "NEGOTIATED";
    scope: "ITEM" | "SALE";
    type: "FIXED" | "PERCENT";
    value: number;
    baseAmount: number;
    amount: number;
    reason: string;
    actorId: number;
    createdAt: string;
  }[];
  receivables: {
    id: number;
    number: number;
    amount: number;
    dueOn: string;
    paid: number;
  }[];
  entitlements: {
    id: number;
    description: string;
    quantity: number;
    redemptions: {
      id: number;
      executionId: number | null;
      quantityDelta: number;
      actorId: number;
      createdAt: string;
      reason: string | null;
      reversal: { id: number } | null;
    }[];
  }[];
  events: CommercialEvent[];
}
export const getOffers = (procedureId?: number) =>
  getJSON<{ offers: Offer[] }>(
    `/api/v1/commercial/offers${procedureId ? `?procedureId=${procedureId}` : ""}`,
  );
export const getOffer = (id: number) =>
  getJSON<Offer>(`/api/v1/commercial/offers/${id}`);
export const publishOffer = (id: number | null, input: OfferInput) =>
  sendJSON<Offer>(
    "POST",
    id
      ? `/api/v1/commercial/offers/${id}/versions`
      : "/api/v1/commercial/offers",
    input,
  );
export const setOfferState = (id: number, active: boolean, reason: string) =>
  sendJSON<Offer>("PATCH", `/api/v1/commercial/offers/${id}/state`, {
    active,
    reason,
  });
export interface CommercialSaleFilters {
  search?: string;
  start?: string;
  end?: string;
  categoryId?: number;
  status?: string;
}
export const getCommercialSales = (
  customerId?: number,
  before?: number,
  filters: CommercialSaleFilters = {},
) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ customerId, before, ...filters }))
    if (value !== undefined && value !== "") query.set(key, String(value));
  return getJSON<{ sales: CommercialSale[]; nextCursor?: number | null }>(
    `/api/v1/commercial/sales?${query}`,
  );
};
export const getCommercialSale = (id: number) =>
  getJSON<CommercialSale>(`/api/v1/commercial/sales/${id}`);
export const createCommercialSale = (input: CommercialSaleInput) =>
  sendJSON<CommercialSale>("POST", "/api/v1/commercial/sales", input);
export const payCommercialSale = (
  id: number,
  input: {
    amount: number;
    method: PaymentMethod;
    installments: number | null;
    requestKey: string;
  },
) =>
  sendJSON<CommercialSale>(
    "POST",
    `/api/v1/commercial/sales/${id}/payments`,
    input,
  );
export const reverseCommercialPayment = (
  id: number,
  reason: string,
  requestKey: string,
) =>
  sendJSON<CommercialSale>(
    "POST",
    `/api/v1/commercial/payments/${id}/reversal`,
    { reason, requestKey },
  );
export const cancelCommercialSale = (id: number, reason: string) =>
  sendJSON<CommercialSale>(
    "POST",
    `/api/v1/commercial/sales/${id}/cancellation`,
    { reason },
  );
export const getEntitlements = (id: number) =>
  getJSON<{ entitlements: Entitlement[] }>(
    `/api/v1/commercial/customers/${id}/entitlements`,
  );
export const reserveEntitlement = (
  id: number,
  entitlementId: number | null,
  variationId: number | null,
) =>
  sendJSON<unknown>(
    "POST",
    `/api/v1/commercial/appointments/${id}/session-reservation`,
    { entitlementId, variationId },
  );
export const reverseRedemption = (
  id: number,
  reason: string,
  requestKey: string,
) =>
  sendJSON<unknown>("POST", `/api/v1/commercial/redemptions/${id}/reversal`, {
    reason,
    requestKey,
  });
export const saleStatusLabels = {
  PAID: "Paga",
  PARTIAL: "Parcialmente paga",
  PENDING: "Pendente",
  CANCELLED: "Cancelada",
};
export const offerStatusLabels = {
  ACTIVE: "Disponível",
  UPCOMING: "Programada",
  EXPIRED: "Encerrada",
  PAUSED: "Pausada",
};
