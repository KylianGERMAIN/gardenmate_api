import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { PlantsService } from "./plants.service";
import { PlantEntity, SunlightLevel } from "./entities/plant.entity";

const mockPlant: PlantEntity = {
  id: "plant-uuid-1",
  name: "Rose",
  sunlightLevel: SunlightLevel.FULL_SUN,
  wateringFrequency: 3,
};

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe("PlantsService", () => {
  let service: PlantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlantsService,
        { provide: getRepositoryToken(PlantEntity), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<PlantsService>(PlantsService);
    jest.clearAllMocks();
  });

  // ─── findAll ───────────────────────────────────────────────────────────────

  describe("findAll", () => {
    it("retourne toutes les plantes sans filtre", async () => {
      mockRepository.find.mockResolvedValue([mockPlant]);

      const result = await service.findAll({});

      expect(mockRepository.find).toHaveBeenCalledWith({ where: {} });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Rose");
    });

    it("filtre par sunlightLevel", async () => {
      mockRepository.find.mockResolvedValue([mockPlant]);

      await service.findAll({ sunlightLevel: SunlightLevel.FULL_SUN });

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { sunlightLevel: SunlightLevel.FULL_SUN },
      });
    });
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe("create", () => {
    it("crée et retourne la plante", async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockPlant);
      mockRepository.save.mockResolvedValue(mockPlant);

      const result = await service.create({
        name: "Rose",
        sunlightLevel: SunlightLevel.FULL_SUN,
        wateringFrequency: 3,
      });

      expect(result.name).toBe("Rose");
    });

    it("lève ConflictException si le nom existe déjà", async () => {
      mockRepository.findOne.mockResolvedValue(mockPlant);

      await expect(
        service.create({ name: "Rose", sunlightLevel: SunlightLevel.FULL_SUN }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────────────────

  describe("remove", () => {
    it("supprime et retourne la plante", async () => {
      mockRepository.findOne.mockResolvedValue(mockPlant);
      mockRepository.remove.mockResolvedValue(mockPlant);

      const result = await service.remove("plant-uuid-1");

      expect(mockRepository.remove).toHaveBeenCalledWith(mockPlant);
      expect(result.id).toBe("plant-uuid-1");
    });

    it("lève NotFoundException si la plante n'existe pas", async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove("unknown-id")).rejects.toThrow(NotFoundException);
    });
  });
});
