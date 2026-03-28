import { UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TokenService } from "./token.service";
import { UserRole } from "@/modules/users/entities/user.entity";

const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn((key: string) => `${key}_value`),
};

describe("TokenService", () => {
  let service: TokenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);

    jest.clearAllMocks();
    mockJwtService.signAsync.mockResolvedValue("signed.token");
  });

  describe("generateAccessToken", () => {
    it("signe avec JWT_ACCESS_SECRET et une durée de 15 minutes", async () => {
      const result = await service.generateAccessToken({
        sub: "uuid-1",
        email: "k@test.com",
        role: UserRole.USER,
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: "uuid-1", email: "k@test.com", role: UserRole.USER },
        { secret: "JWT_ACCESS_SECRET_value", expiresIn: "15m" },
      );
      expect(result).toBe("signed.token");
    });
  });

  describe("generateRefreshToken", () => {
    it("signe avec JWT_REFRESH_SECRET et une durée de 7 jours", async () => {
      const result = await service.generateRefreshToken({ sub: "uuid-1" });

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: "uuid-1" },
        { secret: "JWT_REFRESH_SECRET_value", expiresIn: "7d" },
      );
      expect(result).toBe("signed.token");
    });
  });

  describe("generateTokenPair", () => {
    it("génère access et refresh token en parallèle", async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce("access.token")
        .mockResolvedValueOnce("refresh.token");

      const result = await service.generateTokenPair("uuid-1", "k@test.com", UserRole.USER);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ accessToken: "access.token", refreshToken: "refresh.token" });
    });
  });

  describe("verifyRefreshToken", () => {
    it("retourne le payload sur un token valide", async () => {
      const payload = { sub: "uuid-1" };
      mockJwtService.verifyAsync.mockResolvedValue(payload);

      const result = await service.verifyRefreshToken("valid.token");

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith("valid.token", {
        secret: "JWT_REFRESH_SECRET_value",
      });
      expect(result).toEqual(payload);
    });

    it("lève UnauthorizedException sur un token invalide ou expiré", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("invalid token"));

      await expect(service.verifyRefreshToken("bad.token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
