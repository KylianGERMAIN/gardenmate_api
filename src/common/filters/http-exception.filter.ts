import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { REQUEST_ID_KEY } from "@/common/middleware/request-id.middleware";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /** Extrait un message string depuis la réponse brute d'une HttpException. */
  private extractMessage(raw: unknown): string {
    if (typeof raw === "string") return raw;
    if (raw !== null && typeof raw === "object") {
      const payload = raw as { message?: unknown };
      if (Array.isArray(payload.message)) {
        return (payload.message as string[]).join(", ");
      }
      if (typeof payload.message === "string") return payload.message;
    }
    return "An error occurred";
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    const message = this.extractMessage(rawResponse);

    const requestId = (request[REQUEST_ID_KEY] as string | undefined) ?? null;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      requestId,
    });
  }
}
