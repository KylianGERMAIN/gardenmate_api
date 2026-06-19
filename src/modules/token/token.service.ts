import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { JwtAccessPayload, JwtRefreshPayload } from "./interfaces/jwt-payload.interface";

/** Durée de vie du refresh token (doit rester alignée avec `expires_at` persisté). */
export const REFRESH_TOKEN_TTL = "7d";

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Génère un access token JWT signé (durée : 15 min).
   * Payload : `{ sub, email, role }`.
   */
  async generateAccessToken(payload: JwtAccessPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow("JWT_ACCESS_SECRET"),
      expiresIn: "15m",
    });
  }

  /**
   * Génère un refresh token JWT signé (durée : 7 jours).
   * Payload : `{ sub, jti, family }` — `jti` et `family` permettent rotation et révocation.
   */
  async generateRefreshToken(payload: JwtRefreshPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow("JWT_REFRESH_SECRET"),
      expiresIn: REFRESH_TOKEN_TTL,
    });
  }

  /**
   * Vérifie et décode un refresh token.
   * @throws {UnauthorizedException} si le token est invalide ou expiré
   */
  async verifyRefreshToken(token: string): Promise<JwtRefreshPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtRefreshPayload>(token, {
        secret: this.configService.getOrThrow("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }
}
