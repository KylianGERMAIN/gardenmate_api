import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

/** Injecte le payload JWT de l'utilisateur courant dans le paramètre de la méthode. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtAccessPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as JwtAccessPayload;
  },
);
