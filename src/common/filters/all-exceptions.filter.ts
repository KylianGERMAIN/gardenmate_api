import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { REQUEST_ID_HEADER } from "../middleware/request-id.middleware";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Intercepte toute exception et retourne une réponse JSON uniforme
   * avec le requestId, le timestamp et le chemin de la requête.
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const requestId = (req.headers[REQUEST_ID_HEADER] as string) || "unknown";

    const { statusCode, error, message } = this.extractDetails(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `[${requestId}] ${req.method} ${req.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`[${requestId}] ${req.method} ${req.url} → ${statusCode}`);
    }

    res.status(statusCode).json({
      statusCode,
      error,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }

  /** Extrait le statusCode, le nom d'erreur et le message depuis une exception quelconque. */
  private extractDetails(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === "string") {
        return {
          statusCode,
          error: HttpStatus[statusCode] || "Error",
          message: response,
        };
      }

      const body = response as Record<string, unknown>;
      return {
        statusCode,
        error: (body.error as string) || HttpStatus[statusCode] || "Error",
        message: (body.message as string | string[]) || exception.message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    };
  }
}
