import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { Response } from "express";
import { EquipmentError } from "../domain/equipment-error";
@Catch(EquipmentError)
export class EquipmentErrorFilter implements ExceptionFilter<EquipmentError> {
  catch(error: EquipmentError, host: ArgumentsHost): void {
    const statusCode = { INVALID: 400, CONFLICT: 409, NOT_FOUND: 404 }[
      error.kind
    ];
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(statusCode)
      .json({ error: error.message, statusCode });
  }
}
