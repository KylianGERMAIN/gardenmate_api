import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { UserEntity, UserRole } from "./entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

const mockUser: UserEntity = {
  id: "uuid-1",
  email: "kylian@test.com",
  password: "hashedPassword",
  role: UserRole.USER,
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
};

const adminRequester: JwtAccessPayload = { sub: "admin-uuid", email: "admin@test.com", role: UserRole.ADMIN };
const ownerRequester: JwtAccessPayload = { sub: "uuid-1", email: "kylian@test.com", role: UserRole.USER };
const otherRequester: JwtAccessPayload = { sub: "other-uuid", email: "other@test.com", role: UserRole.USER };

const mockRepository = {
  findOne: jest.fn(),
  remove: jest.fn(),
};

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe("findById", () => {
    it("retourne l'utilisateur si le demandeur est admin", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById("uuid-1", adminRequester);

      expect(result.id).toBe(mockUser.id);
      expect((result as { password?: string }).password).toBeUndefined();
    });

    it("retourne l'utilisateur si le demandeur est le propriétaire", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById("uuid-1", ownerRequester);

      expect(result.id).toBe(mockUser.id);
    });

    it("lève ForbiddenException si le demandeur n'est ni admin ni propriétaire", async () => {
      await expect(service.findById("uuid-1", otherRequester)).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si l'utilisateur n'existe pas", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findById("uuid-1", adminRequester)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("supprime et retourne l'utilisateur si le demandeur est admin", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockUser);

      const result = await service.remove("uuid-1", adminRequester);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(result.id).toBe(mockUser.id);
    });

    it("supprime si le demandeur est le propriétaire", async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);
      mockRepository.remove.mockResolvedValue(mockUser);

      await expect(service.remove("uuid-1", ownerRequester)).resolves.toBeDefined();
    });

    it("lève ForbiddenException si le demandeur n'est ni admin ni propriétaire", async () => {
      await expect(service.remove("uuid-1", otherRequester)).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si l'utilisateur n'existe pas", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("uuid-1", adminRequester)).rejects.toThrow(NotFoundException);
    });
  });
});
