import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { parse, requiredId } from "../../common/util";
import { Actor } from "../../auth/domain/actor";
import { CustomerService } from "../application/customer.service";
import { customerFilter, customerInput, noteInput } from "./customer.schemas";
@Controller("api/v1")
export class CustomersController {
  constructor(
    @Inject(CustomerService) private readonly customers: CustomerService,
  ) {}
  @Get("customers") list(@Query() query: unknown) {
    return this.customers.list(parse(customerFilter, query));
  }
  @Get("customers/:id") detail(@Param("id") id: string) {
    return this.customers.detail(requiredId(id));
  }
  @Post("customers") create(@Body() body: unknown) {
    return this.customers.create(parse(customerInput, body));
  }
  @Put("customers/:id") update(@Param("id") id: string, @Body() body: unknown) {
    return this.customers.update(requiredId(id), parse(customerInput, body));
  }
  @Get("customers/:id/notes") notes(@Param("id") id: string) {
    return this.customers.notes(requiredId(id));
  }
  @Post("customers/:id/notes") addNote(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: { actor: Actor },
  ) {
    const data = parse(noteInput, body);
    return this.customers.addNote(
      requiredId(id),
      data.title,
      data.content,
      request.actor.name,
    );
  }
  @Put("customers/:id/notes/:noteId") updateNote(
    @Param("id") id: string,
    @Param("noteId") noteId: string,
    @Body() body: unknown,
  ) {
    const data = parse(noteInput, body);
    return this.customers.updateNote(
      requiredId(id),
      requiredId(noteId),
      data.title,
      data.content,
    );
  }
  @Delete("customers/:id/notes/:noteId") deleteNote(
    @Param("id") id: string,
    @Param("noteId") noteId: string,
  ) {
    return this.customers.deleteNote(requiredId(id), requiredId(noteId));
  }
}
