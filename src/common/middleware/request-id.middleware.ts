import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const REQUEST_ID_KEY = "requestId";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    /** Réutilise le header entrant pour la traçabilité client→serveur. */
    const requestId =
      (req.headers["x-request-id"] as string | undefined) ?? randomUUID();

    req[REQUEST_ID_KEY] = requestId;
    res.setHeader("X-Request-Id", requestId);

    next();
  }
}
