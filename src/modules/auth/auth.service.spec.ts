import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { UserEntity } from "@/modules/users/entities/user.entity";
import { TokenService } from "@/modules/token/token.service";

jest.mock("bcrypt");

const mockUser: UserEntity = {
  id: "uuid-1",
  email: "kylian@test.com",
  password: "hashedPassword",
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
};

const mockTokenPair = {
  accessToken: "access.token.mock",
  refreshToken: "refresh.token.mock",
};

const mockRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockTokenService = {
  generateTokenPair: jest.fn(),
  verifyRefreshToken: jest.fn(),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepository },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockTokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
  });

  // ─── createUser ────────────────────────────────────────────────────────────

  describe("createUser", () => {
    it("crée un utilisateur et retourne les tokens + user sans password", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.createUser({
        email: "kylian@test.com",
        password: "Abcd95470*",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("Abcd95470*", 10);
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.email,
      );
      expect(result.accessToken).toBe(mockTokenPair.accessToken);
      expect(result.refreshToken).toBe(mockTokenPair.refreshToken);
      expect(result.user.id).toBe(mockUser.id);
      expect(result.user.email).toBe(mockUser.email);
      expect((result as { password?: string }).password).toBeUndefined();
    });

    it("lève ConflictException si l'email est déjà utilisé", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(
        service.createUser({ email: "kylian@test.com", password: "Abcd95470*" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("retourne les tokens + user sur des identifiants valides", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: "kylian@test.com",
        password: "Abcd95470*",
      });

      expect(bcrypt.compare).toHaveBeenCalledWith("Abcd95470*", mockUser.password);
      expect(result.accessToken).toBe(mockTokenPair.accessToken);
      expect(result.user.email).toBe(mockUser.email);
      expect((result as { password?: string }).password).toBeUndefined();
    });

    it("lève UnauthorizedException si l'email est inconnu", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: "inconnu@test.com", password: "Abcd95470*" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("lève UnauthorizedException si le mot de passe est incorrect", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "kylian@test.com", password: "WrongPassword1!" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("retourne le même message d'erreur pour email inconnu et mauvais mot de passe", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const errorUnknownEmail = await service.login({
        email: "inconnu@test.com",
        password: "any",
      }).catch((e: UnauthorizedException) => e);

      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const errorBadPassword = await service.login({
        email: "kylian@test.com",
        password: "wrong",
      }).catch((e: UnauthorizedException) => e);

      expect((errorUnknownEmail as UnauthorizedException).message).toBe(
        (errorBadPassword as UnauthorizedException).message,
      );
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("retourne une nouvelle paire de tokens sur un refresh token valide", async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({ sub: mockUser.id });
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.refresh({ refreshToken: "valid.refresh.token" });

      expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith("valid.refresh.token");
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(mockUser.id, mockUser.email);
      expect(result.accessToken).toBe(mockTokenPair.accessToken);
      expect(result.refreshToken).toBe(mockTokenPair.refreshToken);
    });

    it("lève UnauthorizedException si le refresh token est invalide", async () => {
      mockTokenService.verifyRefreshToken.mockRejectedValue(
        new UnauthorizedException("Invalid or expired refresh token"),
      );

      await expect(
        service.refresh({ refreshToken: "invalid.token" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("lève UnauthorizedException si l'utilisateur n'existe plus en DB", async () => {
      mockTokenService.verifyRefreshToken.mockResolvedValue({ sub: "uuid-deleted" });
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: "valid.token.for.deleted.user" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
