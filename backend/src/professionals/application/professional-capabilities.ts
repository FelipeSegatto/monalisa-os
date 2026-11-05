import { Inject, Injectable } from "@nestjs/common";
import { ProcedureQualifications } from "../domain/procedure-qualifications";
import {
  WorkingCalendar,
  WorkingPeriod,
} from "../../scheduling/domain/working-calendar";
export abstract class ProfessionalCapabilitiesRepository {
  abstract get(id: number): Promise<unknown>;
  abstract save(
    id: number,
    procedures: readonly number[],
    priority: number | null,
    periods: WorkingPeriod[],
    actorId: number,
  ): Promise<unknown>;
}
@Injectable()
export class ProfessionalCapabilitiesService {
  constructor(
    @Inject(ProfessionalCapabilitiesRepository)
    private readonly repo: ProfessionalCapabilitiesRepository,
  ) {}
  get(id: number) {
    return this.repo.get(id);
  }
  save(
    id: number,
    input: {
      procedureIds: number[];
      priority: number | null;
      workingPeriods: WorkingPeriod[];
    },
    actorId: number,
  ) {
    const qualifications = new ProcedureQualifications(input.procedureIds);
    const calendar = new WorkingCalendar(input.workingPeriods);
    return this.repo.save(
      id,
      qualifications.procedureIds,
      input.priority,
      calendar.snapshot(),
      actorId,
    );
  }
}
