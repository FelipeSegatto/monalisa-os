import { Injectable, Inject } from "@nestjs/common";
import { Actor } from "../../auth/domain/actor";
import {
  SchedulingRepository,
  ReservationInput,
} from "./scheduling.repository";
@Injectable()
export class BookingService {
  constructor(
    @Inject(SchedulingRepository) private readonly repo: SchedulingRepository,
  ) {}
  reassign(id: number, professionalId: number | undefined, actor: Actor) {
    return this.repo.reassign(id, professionalId, actor);
  }
  reserve(input: ReservationInput, actor: Actor | null) {
    return this.repo.reserve(
      {
        ...input,
        origin: actor ? "INTERNAL" : "EXTERNAL",
        ...(!actor
          ? {
              customerId: undefined,
              professionalId: undefined,
              durationMinutes: undefined,
              status: undefined,
            }
          : {}),
      },
      actor,
    );
  }
  confirm(id: number, duration: number | undefined, actor: Actor) {
    return this.repo.confirm(id, duration, actor);
  }
  available(
    procedureId: number,
    start: Date,
    duration?: number,
    excludeId?: number,
  ) {
    return this.repo.available(procedureId, start, duration, excludeId);
  }
  dailySlots(id: number, date: string) {
    return this.repo.dailySlots(id, date);
  }
  settings() {
    return this.repo.settings();
  }
  saveSettings(input: {
    assignmentPolicy: string;
    confirmationMode: string;
    holdMinutes: number;
  }) {
    return this.repo.saveSettings(input);
  }
}
