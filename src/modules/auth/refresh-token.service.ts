import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash, randomUUID } from "node:crypto";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";
import { TokenService } from "@/modules/token/token.service";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours, aligné avec REFRESH_TOKEN_TTL

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Émet un refresh token (nouveau `jti`) dans une famille donnée et persiste son hash.
   * @param familyId famille de rotation (nouvelle session, ou rotation dans la même famille)
   */
  async issue(userId: string, familyId: string, now: Date = new Date()): Promise<string> {
    const jti = randomUUID();
    const token = await this.tokenService.generateRefreshToken({
      sub: userId,
      jti,
      family: familyId,
    });

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        id: jti,
        userId,
        familyId,
        tokenHash: this.hash(token),
        revoked: false,
        expiresAt: new Date(now.getTime() + TTL_MS),
      }),
    );

    return token;
  }

  /**
   * Valide un refresh token et le consomme (usage unique). Retourne l'utilisateur et
   * la famille pour ré-émission. Détecte la réutilisation : un token déjà consommé ou
   * révoqué fait révoquer toute la famille (recommandation OWASP).
   * @throws {UnauthorizedException} si le token est invalide, expiré, ou réutilisé
   */
  async rotate(token: string, now: Date = new Date()): Promise<{ userId: string; familyId: string }> {
    const payload = await this.tokenService.verifyRefreshToken(token);
    const record = await this.refreshTokenRepository.findOne({ where: { id: payload.jti } });

    if (!record || record.expiresAt.getTime() <= now.getTime() || record.tokenHash !== this.hash(token)) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (record.revoked) {
      await this.revokeFamily(record.familyId);
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    record.revoked = true;
    await this.refreshTokenRepository.save(record);

    return { userId: record.userId, familyId: record.familyId };
  }

  /** Révoque tous les refresh tokens d'une famille (rotation compromise ou logout). */
  async revokeFamily(familyId: string): Promise<void> {
    await this.refreshTokenRepository.update({ familyId }, { revoked: true });
  }

  /**
   * Révoque la famille du refresh token fourni (logout).
   * @throws {UnauthorizedException} si le token est invalide ou expiré
   */
  async revokeByToken(token: string): Promise<void> {
    const payload = await this.tokenService.verifyRefreshToken(token);
    await this.revokeFamily(payload.family);
  }

  /** SHA-256 hex du token (haute entropie → pas besoin de bcrypt). */
  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
