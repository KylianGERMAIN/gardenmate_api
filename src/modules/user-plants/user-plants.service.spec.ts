import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { UserPlantsService } from "./user-plants.service";
import { UserPlantEntity } from "./entities/user-plant.entity";
import { SunlightLevel } from "@/modules/plants/entities/plant.entity";
import { UserRole } from "@/modules/users/entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

const mockPlant = {
  id: "plant-uuid",
  name: "Rose",
  sunlightLevel: SunlightLevel.FULL_SUN,
  wateringFrequency: 3,
};

const mockUserPlant: UserPlantEntity = {
  id: "up-uuid",
  userId: "user-uuid",
  plantId: "plant-uuid",
  plantedAt: new Date("2024-01-01"),
  lastWateredAt: new Date("2024-01-10"),
  plant: mockPlant as never,
  user: {} as never,
};

const owner: JwtAccessPayload = { sub: "user-uuid", email: "k@test.com", role: UserRole.USER };
const admin: JwtAccessPayload = { sub: "admin-uuid", email: "admin@test.com", role: UserRole.ADMIN };
const other: JwtAccessPayload = { sub: "other-uuid", email: "other@test.com", role: UserRole.USER };

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

describe("UserPlantsService", () => {
  let service: UserPlantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserPlantsService,
        { provide: getRepositoryToken(UserPlantEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<UserPlantsService>(UserPlantsService);
    jest.clearAllMocks();
  });

  // ─── assign ────────────────────────────────────────────────────────────────

  describe("assign", () => {
    it("assigne une plante et retourne la UserPlant", async () => {
      mockRepo.create.mockReturnValue(mockUserPlant);
      mockRepo.save.mockResolvedValue(mockUserPlant);
      mockRepo.findOne.mockResolvedValue(mockUserPlant);

      const result = await service.assign(
        "user-uuid",
        { plantId: "plant-uuid" },
        owner,
      );

      expect(result.id).toBe("up-uuid");
    });

    it("lève ForbiddenException si le demandeur n'est pas le propriétaire", async () => {
      await expect(service.assign("user-uuid", { plantId: "plant-uuid" }, other)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("retourne les plantes de l'utilisateur", async () => {
      mockRepo.find.mockResolvedValue([mockUserPlant]);

      const result = await service.findAll("user-uuid", owner);

      expect(result).toHaveLength(1);
    });

    it("lève ForbiddenException si autre utilisateur", async () => {
      await expect(service.findAll("user-uuid", other)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── findNeedingWater ──────────────────────────────────────────────────────

  describe("findNeedingWater", () => {
    it("retourne uniquement les plantes en manque d'eau", async () => {
      const oldWatering: UserPlantEntity = {
        ...mockUserPlant,
        lastWateredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      };
      mockRepo.find.mockResolvedValue([oldWatering]);

      const result = await service.findNeedingWater("user-uuid", owner);

      expect(result).toHaveLength(1);
    });

    it("admin peut accéder aux plantes d'un autre utilisateur", async () => {
      mockRepo.find.mockResolvedValue([]);

      await expect(service.findNeedingWater("user-uuid", admin)).resolves.toBeDefined();
    });

    it("lève ForbiddenException si non admin et non propriétaire", async () => {
      await expect(service.findNeedingWater("user-uuid", other)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── update ────────────────────────────────────────────────────────────────

  describe("update", () => {
    it("met à jour lastWateredAt", async () => {
      mockRepo.findOne
        .mockResolvedValueOnce(mockUserPlant)
        .mockResolvedValueOnce({ ...mockUserPlant, lastWateredAt: new Date("2024-02-01") });
      mockRepo.save.mockResolvedValue({ ...mockUserPlant });

      const result = await service.update(
        "user-uuid",
        "up-uuid",
        { lastWateredAt: "2024-02-01T00:00:00.000Z" },
        owner,
      );

      expect(result).toBeDefined();
    });

    it("lève BadRequestException si aucun champ fourni", async () => {
      await expect(service.update("user-uuid", "up-uuid", {}, owner)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("lève NotFoundException si la UserPlant n'existe pas", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("user-uuid", "up-uuid", { plantedAt: "2024-01-01T00:00:00.000Z" }, owner),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("supprime la UserPlant", async () => {
      mockRepo.findOne.mockResolvedValue(mockUserPlant);
      mockRepo.remove.mockResolvedValue(mockUserPlant);

      const result = await service.remove("user-uuid", "up-uuid", owner);

      expect(mockRepo.remove).toHaveBeenCalledWith(mockUserPlant);
      expect(result.id).toBe("up-uuid");
    });

    it("lève ForbiddenException si non propriétaire", async () => {
      await expect(service.remove("user-uuid", "up-uuid", other)).rejects.toThrow(ForbiddenException);
    });

    it("lève NotFoundException si la UserPlant n'existe pas", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("user-uuid", "up-uuid", owner)).rejects.toThrow(NotFoundException);
    });
  });
});
