import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { createHash } from "node:crypto";
import { RefreshTokenService } from "./refresh-token.service";
import { RefreshTokenEntity } from "./entities/refresh-token.entity";
import { TokenService } from "@/modules/token/token.service";

const sha256 = (t: string): string => createHash("sha256").update(t).digest("hex");

const NOW = new Date("2026-07-15T08:00:00.000Z");
const FUTURE = new Date(NOW.getTime() + 60_000);
const PAST = new Date(NOW.getTime() - 60_000);
const TOKEN = "the.refresh.token";

const mockRepo = {
  create: jest.fn((x: unknown) => x),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};
const mockTokenService = {
  generateRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
};

/** Enregistrement valide de base, surchargé par test. */
function record(overrides: Partial<RefreshTokenEntity> = {}): Partial<RefreshTokenEntity> {
  return {
    id: "jti1",
    userId: "u1",
    familyId: "fam1",
    tokenHash: sha256(TOKEN),
    revoked: false,
    expiresAt: FUTURE,
    ...overrides,
  };
}

describe("RefreshTokenService", () => {
  let service: RefreshTokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: mockRepo },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    jest.clearAllMocks();
    mockRepo.create.mockImplementation((x: unknown) => x);
    mockTokenService.generateRefreshToken.mockResolvedValue("signed.refresh");
    mockTokenService.verifyRefreshToken.mockResolvedValue({
      sub: "u1",
      jti: "jti1",
      family: "fam1",
    });
  });

  describe("issue", () => {
    it("émet un token et persiste son hash (jamais le token en clair)", async () => {
      const token = await service.issue("u1", "fam1", NOW);

      expect(mockTokenService.generateRefreshToken).toHaveBeenCalledWith(
        expect.objectContaining({ sub: "u1", family: "fam1" }),
      );
      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u1",
          familyId: "fam1",
          tokenHash: sha256("signed.refresh"),
          revoked: false,
        }),
      );
      expect(token).toBe("signed.refresh");
    });
  });

  describe("rotate", () => {
    it("consomme le token et retourne user + famille", async () => {
      mockRepo.findOne.mockResolvedValue(record());

      const result = await service.rotate(TOKEN, NOW);

      expect(result).toEqual({ userId: "u1", familyId: "fam1" });
      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({ revoked: true }));
    });

    it("détecte la réutilisation et révoque toute la famille", async () => {
      mockRepo.findOne.mockResolvedValue(record({ revoked: true }));

      await expect(service.rotate(TOKEN, NOW)).rejects.toThrow(UnauthorizedException);
      expect(mockRepo.update).toHaveBeenCalledWith({ familyId: "fam1" }, { revoked: true });
    });

    it("rejette un token expiré (sans révoquer la famille)", async () => {
      mockRepo.findOne.mockResolvedValue(record({ expiresAt: PAST }));

      await expect(service.rotate(TOKEN, NOW)).rejects.toThrow(UnauthorizedException);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it("rejette si l'enregistrement est introuvable", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.rotate(TOKEN, NOW)).rejects.toThrow(UnauthorizedException);
    });

    it("rejette si le hash ne correspond pas", async () => {
      mockRepo.findOne.mockResolvedValue(record({ tokenHash: "different-hash" }));

      await expect(service.rotate(TOKEN, NOW)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("revokeByToken", () => {
    it("révoque la famille du token (logout)", async () => {
      await service.revokeByToken(TOKEN);

      expect(mockRepo.update).toHaveBeenCalledWith({ familyId: "fam1" }, { revoked: true });
    });
  });
});
