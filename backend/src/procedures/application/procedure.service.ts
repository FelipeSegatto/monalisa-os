import { Inject, Injectable } from "@nestjs/common";
import { Procedure } from "../domain/procedure";
import {
  ProcedureDetails,
  ProcedureTechnology,
  OptionInput,
  MaterialInput,
} from "../domain/procedure.types";
import { ProcedureRepository } from "../domain/procedure.repository";
import { ProcedureQueries } from "./procedure.queries";
import { EquipmentCompatibilityPort } from "./equipment-compatibility.port";
export interface SaveProcedure extends ProcedureDetails {
  active: boolean;
  variations: OptionInput[];
  technology?: ProcedureTechnology;
  requiresEquipment?: boolean;
}
@Injectable()
export class ProcedureService {
  constructor(
    @Inject(ProcedureRepository)
    private readonly repository: ProcedureRepository,
    @Inject(ProcedureQueries) private readonly queries: ProcedureQueries,
    @Inject(EquipmentCompatibilityPort)
    private readonly equipment: EquipmentCompatibilityPort,
  ) {}
  categories() {
    return this.queries.categories();
  }
  publicCatalog() {
    return this.queries.categories(true);
  }
  detail(id: number) {
    return this.queries.detail(id);
  }
  materials(id: number) {
    return this.queries.materials(id);
  }
  async create(data: SaveProcedure) {
    const procedure = Procedure.create(data);
    const technology = data.technology ?? "GENERAL";
    procedure.configureEquipment(
      technology,
      data.requiresEquipment ?? technology !== "GENERAL",
    );
    procedure.replaceOptions(data.variations);
    procedure.updateActivation(data.active, {
      reviewed: false,
      hasActiveCompatible: false,
    });
    return this.queries.detail(await this.repository.create(procedure));
  }
  async update(id: number, data: SaveProcedure) {
    await this.repository.updateLocked(id, (procedure, availability) => {
      const old = procedure.snapshot();
      procedure.updateDetails(data);
      const technology = data.technology ?? old.technology;
      procedure.configureEquipment(
        technology,
        data.requiresEquipment ??
          (technology !== "GENERAL" || old.requiresEquipment),
      );
      procedure.replaceOptions(data.variations);
      procedure.updateActivation(data.active, availability);
    });
    return this.queries.detail(id);
  }
  async setActive(id: number, active: boolean) {
    await this.repository.updateLocked(id, (procedure, availability) => {
      if (active) procedure.activate(availability);
      else procedure.deactivate();
    });
    return this.queries.detail(id);
  }
  async setMaterials(id: number, input: MaterialInput[]) {
    await this.repository.updateLocked(id, (procedure) =>
      procedure.configureMaterials(input, new Date()),
    );
    return this.queries.materials(id);
  }
  async configureEquipment(
    id: number,
    technology: ProcedureTechnology,
    requiresEquipment: boolean,
  ) {
    await this.repository.updateLocked(id, (procedure) =>
      procedure.configureEquipment(technology, requiresEquipment),
    );
    return this.queries.detail(id);
  }
  async resourcePolicy(id: number) {
    const procedure = await this.queries.detail(id),
      availability = await this.equipment.availability(id);
    return {
      technology: procedure.technology,
      requiresEquipment: procedure.requiresEquipment,
      ...availability,
      operational:
        !procedure.requiresEquipment ||
        (availability.reviewed && availability.hasActiveCompatible),
    };
  }
}
