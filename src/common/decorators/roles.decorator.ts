import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@/modules/users/entities/user.entity";

export const ROLES_KEY = "roles";

/** Restreint l'accès aux utilisateurs ayant l'un des rôles listés. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
