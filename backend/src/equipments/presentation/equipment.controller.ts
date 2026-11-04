import {
  Body,
  Inject,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { Admin, Actor } from "../../auth/auth.guard";
import { parse, requiredId } from "../../common/util";
import { EquipmentService } from "../application/equipment.service";
import {
  compatibilityInput,
  componentInput,
  equipmentInput,
  maintenanceInput,
  scheduleInput,
  statusInput,
} from "./equipment.schemas";

@Controller("api/v1")
export class EquipmentController {
  constructor(
    @Inject(EquipmentService) private readonly equipment: EquipmentService,
  ) {}
  @Get("equipment") list() {
    return this.equipment.list();
  }
  @Get("equipment/:id") detail(@Param("id") id: string) {
    return this.equipment.detail(requiredId(id));
  }
  @Get("equipment/:id/events") history(
    @Param("id") id: string,
    @Query("before") before?: string,
  ) {
    return this.equipment.history(
      requiredId(id),
      before === undefined ? undefined : requiredId(before),
    );
  }
  @Admin() @Post("equipment") create(
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    return this.equipment.create(parse(equipmentInput, body), req.actor.id);
  }
  @Admin() @Put("equipment/:id") update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    return this.equipment.update(
      requiredId(id),
      parse(equipmentInput, body),
      req.actor.id,
    );
  }
  @Admin() @Post("equipment/:id/components") component(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    return this.equipment.component(
      requiredId(id),
      parse(componentInput, body),
      req.actor.id,
    );
  }
  @Admin() @Put("equipment/:id/components/:componentId") updateComponent(
    @Param("id") id: string,
    @Param("componentId") componentId: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    return this.equipment.updateComponent(
      requiredId(id),
      requiredId(componentId),
      parse(componentInput, body),
      req.actor.id,
    );
  }
  @Admin() @Patch("equipment/:id/status") status(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    const p = parse(statusInput, body);
    return this.equipment.status(
      requiredId(id),
      p.status,
      p.reason,
      req.actor.id,
    );
  }
  @Admin()
  @Patch("equipment/:id/components/:componentId/status")
  componentStatus(
    @Param("id") id: string,
    @Param("componentId") componentId: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    const p = parse(statusInput, body);
    return this.equipment.status(
      requiredId(id),
      p.status,
      p.reason,
      req.actor.id,
      requiredId(componentId),
    );
  }
  @Admin() @Post("equipment/:id/maintenance/schedule") schedule(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    const p = parse(scheduleInput, body);
    return this.equipment.schedule(
      requiredId(id),
      p.nextDate,
      p.reason,
      req.actor.id,
    );
  }
  @Admin() @Post("equipment/:id/maintenance") maintenance(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    const p = parse(maintenanceInput, body);
    return this.equipment.maintenance(
      requiredId(id),
      p.performedOn,
      p.nextDate,
      p.reason,
      req.actor.id,
    );
  }
  @Get("procedures/:id/equipment") resources(@Param("id") id: string) {
    return this.equipment.procedureResources(requiredId(id));
  }
  @Admin() @Put("procedures/:id/equipment") compatibility(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { actor: Actor },
  ) {
    return this.equipment.setProcedureResources(
      requiredId(id),
      parse(compatibilityInput, body).equipmentIds,
      req.actor.id,
    );
  }
}
