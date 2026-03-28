import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";
export const REQUEST_ID_KEY = "requestId";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  /** Génère ou réutilise un UUID de requête et l'attache au header `x-request-id`. */
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? randomUUID();

    req.headers[REQUEST_ID_HEADER] = requestId;
    req[REQUEST_ID_KEY] = requestId;
    res.setHeader("X-Request-Id", requestId);

    next();
  }
}
