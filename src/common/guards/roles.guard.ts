import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import type { UserRole } from "@/modules/users/entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<Request & { user: JwtAccessPayload }>();

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
