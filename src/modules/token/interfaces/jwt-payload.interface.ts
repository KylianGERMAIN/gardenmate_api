import type { UserRole } from "@/modules/users/entities/user.entity";

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface JwtRefreshPayload {
  sub: string;
  /** Identifiant unique du token (claim `jti`), clé de l'enregistrement persisté. */
  jti: string;
  /** Famille de rotation : partagée par tous les tokens d'une même session. */
  family: string;
}
