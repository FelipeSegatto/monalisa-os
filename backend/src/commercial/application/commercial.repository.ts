import { Actor } from "../../auth/domain/actor";
import { OfferVersionInput } from "../domain/commercial-offer";
import { SaleInput } from "../domain/sale";
export interface SaleListFilters {
  search?: string;
  start?: string;
  end?: string;
  categoryId?: number;
  status?: "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";
}
export abstract class CommercialRepository {
  abstract attachSession(
    appointmentId: number,
    entitlementId: number | null,
    variationId: number | null,
    actor: Actor,
  ): Promise<unknown>;
  abstract legacyCreate(input: any, actor: Actor): Promise<any>;
  abstract offers(procedureId?: number): Promise<any>;
  abstract offer(id: number): Promise<any>;
  abstract publish(
    id: number | null,
    input: OfferVersionInput,
    actor: Actor,
  ): Promise<any>;
  abstract setOfferActive(
    id: number,
    active: boolean,
    reason: string,
    actor: Actor,
  ): Promise<any>;
  abstract sales(
    actor: Actor,
    customerId?: number,
    before?: number,
    filters?: SaleListFilters,
  ): Promise<any>;
  abstract sale(id: number, actor: Actor): Promise<any>;
  abstract createSale(input: SaleInput, actor: Actor): Promise<any>;
  abstract payment(
    id: number,
    input: {
      amount: number;
      method: "PIX" | "CASH" | "CARD";
      installments?: number | null;
      requestKey: string;
    },
    actor: Actor,
  ): Promise<any>;
  abstract reversePayment(
    id: number,
    reason: string,
    requestKey: string,
    actor: Actor,
  ): Promise<any>;
  abstract cancelSale(id: number, reason: string, actor: Actor): Promise<any>;
  abstract entitlements(customerId: number, actor: Actor): Promise<any>;
  abstract reverseRedemption(
    id: number,
    reason: string,
    requestKey: string,
    actor: Actor,
  ): Promise<any>;
  abstract offerSeries(months: number, actor: Actor): Promise<any>;
}
