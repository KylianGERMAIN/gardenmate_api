import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { RefreshTokenService } from "./refresh-token.service";
import { UserEntity, UserRole } from "@/modules/users/entities/user.entity";
import { TokenService } from "@/modules/token/token.service";

jest.mock("bcrypt");

const mockUser: UserEntity = {
  id: "uuid-1",
  email: "kylian@test.com",
  password: "hashedPassword",
  role: UserRole.USER,
  latitude: null,
  longitude: null,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
};

const mockRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockTokenService = {
  generateAccessToken: jest.fn(),
};

const mockRefreshTokenService = {
  issue: jest.fn(),
  rotate: jest.fn(),
  revokeFamily: jest.fn(),
  revokeByToken: jest.fn(),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepository },
        { provide: TokenService, useValue: mockTokenService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockTokenService.generateAccessToken.mockResolvedValue("access.token.mock");
    mockRefreshTokenService.issue.mockResolvedValue("refresh.token.mock");
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
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(mockRefreshTokenService.issue).toHaveBeenCalled();
      expect(result.accessToken).toBe("access.token.mock");
      expect(result.refreshToken).toBe("refresh.token.mock");
      expect(result.user.id).toBe(mockUser.id);
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

      const result = await service.login({ email: "kylian@test.com", password: "Abcd95470*" });

      expect(bcrypt.compare).toHaveBeenCalledWith("Abcd95470*", mockUser.password);
      expect(result.accessToken).toBe("access.token.mock");
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
      const errorUnknownEmail = await service
        .login({ email: "inconnu@test.com", password: "any" })
        .catch((e: UnauthorizedException) => e);

      mockRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      const errorBadPassword = await service
        .login({ email: "kylian@test.com", password: "wrong" })
        .catch((e: UnauthorizedException) => e);

      expect((errorUnknownEmail as UnauthorizedException).message).toBe(
        (errorBadPassword as UnauthorizedException).message,
      );
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe("refresh", () => {
    it("fait tourner le token et réémet dans la même famille", async () => {
      mockRefreshTokenService.rotate.mockResolvedValue({ userId: mockUser.id, familyId: "fam-1" });
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.refresh({ refreshToken: "valid.refresh.token" });

      expect(mockRefreshTokenService.rotate).toHaveBeenCalledWith("valid.refresh.token");
      expect(mockRefreshTokenService.issue).toHaveBeenCalledWith(mockUser.id, "fam-1");
      expect(result.accessToken).toBe("access.token.mock");
      expect(result.refreshToken).toBe("refresh.token.mock");
    });

    it("lève UnauthorizedException si le refresh token est invalide ou réutilisé", async () => {
      mockRefreshTokenService.rotate.mockRejectedValue(
        new UnauthorizedException("Invalid or expired refresh token"),
      );

      await expect(service.refresh({ refreshToken: "invalid.token" })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("révoque la famille et lève si l'utilisateur n'existe plus", async () => {
      mockRefreshTokenService.rotate.mockResolvedValue({ userId: "uuid-deleted", familyId: "fam-x" });
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: "valid.token.for.deleted.user" }),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockRefreshTokenService.revokeFamily).toHaveBeenCalledWith("fam-x");
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("révoque la famille du refresh token fourni", async () => {
      mockRefreshTokenService.revokeByToken.mockResolvedValue(undefined);

      await service.logout({ refreshToken: "some.refresh.token" });

      expect(mockRefreshTokenService.revokeByToken).toHaveBeenCalledWith("some.refresh.token");
    });
  });
});
