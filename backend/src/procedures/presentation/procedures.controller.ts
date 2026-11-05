import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { Admin, Public } from "../../auth/presentation/auth.decorators";
import { parse, requiredId } from "../../common/util";
import { ProcedureService } from "../application/procedure.service";
import {
  procedureInput,
  materialInput,
  activeInput,
  policyInput,
} from "./procedure.schemas";
@Controller("api/v1")
export class ProceduresController {
  constructor(
    @Inject(ProcedureService) private readonly procedures: ProcedureService,
  ) {}
  @Get("procedure-categories") categories() {
    return this.procedures.categories();
  }
  @Public() @Get("public/catalog") publicCatalog() {
    return this.procedures.publicCatalog();
  }
  @Get("procedures/:id") detail(@Param("id") id: string) {
    return this.procedures.detail(requiredId(id));
  }
  @Admin() @Post("procedures") create(@Body() body: unknown) {
    return this.procedures.create(parse(procedureInput, body));
  }
  @Admin() @Put("procedures/:id") update(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.procedures.update(requiredId(id), parse(procedureInput, body));
  }
  @Admin() @Patch("procedures/:id/active") active(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.procedures.setActive(
      requiredId(id),
      parse(activeInput, body).active,
    );
  }
  @Get("procedures/:id/materials") materials(@Param("id") id: string) {
    return this.procedures.materials(requiredId(id));
  }
  @Admin() @Put("procedures/:id/materials") setMaterials(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.procedures.setMaterials(
      requiredId(id),
      parse(materialInput, body),
    );
  }
  @Get("procedures/:id/resource-policy") resourcePolicy(
    @Param("id") id: string,
  ) {
    return this.procedures.resourcePolicy(requiredId(id));
  }
  @Admin() @Patch("procedures/:id/resource-policy") policy(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const data = parse(policyInput, body);
    return this.procedures.configureEquipment(
      requiredId(id),
      data.technology,
      data.requiresEquipment,
    );
  }
}
