import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import { ApplicationError } from "../domain/application-error";
interface ApiFailure {
  error: string;
  statusCode: number;
  details?: { fieldErrors: Record<string, string[]>; formErrors: string[] };
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  catch(error: unknown, host: ArgumentsHost): void {
    const body = this.format(error);
    if (body.statusCode >= 500) {
      // Deliberately omit error.message, request bodies, URLs, cookies and SQL.
      const name =
        error instanceof Error ? error.constructor.name : "UnknownError";
      this.logger.error(`Falha interna (${name}); resposta ${body.statusCode}`);
    }
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }
  private format(error: unknown): ApiFailure {
    if (error instanceof ApplicationError)
      return {
        error: error.message,
        statusCode: {
          INVALID_INPUT: 400,
          UNAUTHENTICATED: 401,
          FORBIDDEN: 403,
          CONFLICT: 409,
          NOT_FOUND: 404,
        }[error.category],
      };
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const known: Record<string, ApiFailure> = {
        P2000: { error: "Valor inválido para um dos campos", statusCode: 400 },
        P2002: {
          error: "Já existe um registro com esses dados",
          statusCode: 409,
        },
        P2003: {
          error: "Operação incompatível com registros relacionados",
          statusCode: 409,
        },
        P2025: { error: "Registro não encontrado", statusCode: 404 },
        P2024: {
          error: "Serviço temporariamente indisponível",
          statusCode: 503,
        },
        P2034: {
          error: "Conflito de atualização. Tente novamente.",
          statusCode: 409,
        },
      };
      return known[error.code] ?? { error: "Erro interno", statusCode: 500 };
    }
    if (error instanceof Prisma.PrismaClientInitializationError)
      return { error: "Serviço temporariamente indisponível", statusCode: 503 };
    if (error instanceof HttpException) {
      const statusCode = error.getStatus();
      if (statusCode >= 500) return { error: "Erro interno", statusCode };
      const raw = error.getResponse();
      if (typeof raw === "string") return { error: raw, statusCode };
      if (raw && typeof raw === "object") {
        if ("fieldErrors" in raw && "formErrors" in raw) {
          const fields =
            raw.fieldErrors &&
            typeof raw.fieldErrors === "object" &&
            !Array.isArray(raw.fieldErrors)
              ? (raw.fieldErrors as Record<string, unknown>)
              : {};
          const fieldErrors: Record<string, string[]> = {};
          for (const [key, value] of Object.entries(fields))
            if (Array.isArray(value))
              fieldErrors[key] = value.filter(
                (message): message is string => typeof message === "string",
              );
          return {
            error: "Dados inválidos",
            statusCode,
            details: {
              fieldErrors,
              formErrors: Array.isArray(raw.formErrors)
                ? raw.formErrors.filter(
                    (message): message is string => typeof message === "string",
                  )
                : [],
            },
          };
        }
        if ("message" in raw)
          return {
            error: Array.isArray(raw.message)
              ? raw.message.join("; ")
              : String(raw.message),
            statusCode,
          };
      }
      return { error: "Requisição inválida", statusCode };
    }
    return { error: "Erro interno", statusCode: 500 };
  }
}
