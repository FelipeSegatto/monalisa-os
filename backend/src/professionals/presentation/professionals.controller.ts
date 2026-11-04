import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { Admin } from "../../auth/presentation/auth.decorators";
import { parse, requiredId } from "../../common/util";
import { ProfessionalService } from "../application/professional.service";
import { professionalInput, accountInput } from "./professional.schemas";
@Controller("api/v1")
export class ProfessionalsController {
  constructor(
    @Inject(ProfessionalService)
    private readonly professionals: ProfessionalService,
  ) {}
  @Get("professionals") list() {
    return this.professionals.list();
  }
  @Get("professionals/:id") detail(@Param("id") id: string) {
    return this.professionals.detail(requiredId(id));
  }
  @Admin() @Post("professionals") create(@Body() body: unknown) {
    return this.professionals.create(parse(professionalInput, body));
  }
  @Admin() @Put("professionals/:id") update(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.professionals.update(
      requiredId(id),
      parse(professionalInput, body),
    );
  }
  @Admin() @Get("professionals/:id/account") account(@Param("id") id: string) {
    return this.professionals.account(requiredId(id));
  }
  @Admin() @Post("professionals/:id/account") configure(
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const data = parse(accountInput, body);
    return this.professionals.configureAccount(
      requiredId(id),
      data.email,
      data.password,
    );
  }
}
