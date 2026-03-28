import type { UserRole } from "@/modules/users/entities/user.entity";

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface JwtRefreshPayload {
  sub: string;
}
