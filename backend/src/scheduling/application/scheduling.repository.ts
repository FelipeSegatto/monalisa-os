import { Actor } from "../../auth/domain/actor";
export interface ReservationInput {
  entitlementId?: number;
  variationId?: number | null;
  customerId?: number;
  customer?: { name: string; phone: string };
  procedureId: number;
  professionalId?: number;
  startsAt: string;
  durationMinutes?: number;
  status?: "SCHEDULED" | "CONFIRMED";
  origin?: "INTERNAL" | "EXTERNAL";
}
export abstract class SchedulingRepository {
  abstract reassign(
    id: number,
    professionalId: number | undefined,
    actor: Actor,
  ): Promise<unknown>;
  abstract reserve(
    input: ReservationInput,
    actor: Actor | null,
  ): Promise<unknown>;
  abstract confirm(
    id: number,
    durationMinutes: number | undefined,
    actor: Actor,
  ): Promise<unknown>;
  abstract available(
    procedureId: number,
    start: Date,
    duration?: number,
    excludeId?: number,
  ): Promise<{ id: number; name: string; color: string }[]>;
  abstract dailySlots(procedureId: number, date: string): Promise<string[]>;
  abstract settings(): Promise<{
    assignmentPolicy: string;
    confirmationMode: string;
    holdMinutes: number;
  }>;
  abstract saveSettings(input: {
    assignmentPolicy: string;
    confirmationMode: string;
    holdMinutes: number;
  }): Promise<unknown>;
}
