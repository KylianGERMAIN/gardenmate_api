import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { JwtAccessPayload, JwtRefreshPayload } from "./interfaces/jwt-payload.interface";
import type { TokenPair } from "./interfaces/token-pair.interface";

export type { TokenPair };

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Génère un access token JWT signé (durée : 15 min).
   * Payload : `{ sub, email }`.
   */
  async generateAccessToken(payload: JwtAccessPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow("JWT_ACCESS_SECRET"),
      expiresIn: "15m",
    });
  }

  /**
   * Génère un refresh token JWT signé (durée : 7 jours).
   * Payload volontairement minimal : `{ sub }` uniquement.
   */
  async generateRefreshToken(payload: JwtRefreshPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow("JWT_REFRESH_SECRET"),
      expiresIn: "7d",
    });
  }

  /**
   * Génère une paire access/refresh token en parallèle.
   * Point d'entrée principal pour tous les flux d'authentification.
   */
  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken({ sub: userId, email }),
      this.generateRefreshToken({ sub: userId }),
    ]);

    return { accessToken, refreshToken };
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
