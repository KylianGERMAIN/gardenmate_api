import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/**
 * Protège les endpoints internes (machine-to-machine) par un secret partagé,
 * fourni dans le header `x-internal-secret`. Utilisé pour les déclencheurs
 * externes (ex : le cron GitHub Actions des rappels d'arrosage).
 */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>("REMINDERS_SECRET");
    const provided = context.switchToHttp().getRequest<Request>().headers["x-internal-secret"];

    if (!expected || provided !== expected) {
      throw new UnauthorizedException("Invalid internal secret");
    }

    return true;
  }
}
