import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getDataSourceToken } from "@nestjs/typeorm";
import { WateringEventsService } from "./watering-events.service";
import { WateringEventEntity } from "./entities/watering-event.entity";
import { UserPlantEntity } from "@/modules/user-plants/entities/user-plant.entity";
import { UserRole } from "@/modules/users/entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

const owner: JwtAccessPayload = { sub: "user-uuid", email: "k@test.com", role: UserRole.USER };
const other: JwtAccessPayload = { sub: "other-uuid", email: "o@test.com", role: UserRole.USER };

const mockUserPlant: UserPlantEntity = {
  id: "up-uuid",
  userId: "user-uuid",
  plantId: "plant-uuid",
  plantedAt: null,
  lastWateredAt: null,
  plant: {} as never,
  user: {} as never,
};

const mockWateringEvent: WateringEventEntity = {
  id: "we-uuid",
  userPlantId: "up-uuid",
  wateredAt: new Date("2024-01-15"),
  note: "test note",
  userPlant: {} as never,
};

const mockEntityManager = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb: (manager: typeof mockEntityManager) => Promise<unknown>) =>
    cb(mockEntityManager),
  ),
};

describe("WateringEventsService", () => {
  let service: WateringEventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WateringEventsService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<WateringEventsService>(WateringEventsService);
    jest.clearAllMocks();
  });

  // ─── water ─────────────────────────────────────────────────────────────────

  describe("water", () => {
    it("crée un event et met à jour lastWateredAt de façon transactionnelle", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUserPlant);
      mockEntityManager.save.mockResolvedValueOnce(mockUserPlant).mockResolvedValueOnce(mockWateringEvent);
      mockEntityManager.create.mockReturnValue(mockWateringEvent);

      const result = await service.water("user-uuid", "up-uuid", { note: "test note" }, owner);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(mockEntityManager.findOne).toHaveBeenCalledWith(UserPlantEntity, {
        where: { id: "up-uuid", userId: "user-uuid" },
      });
      expect(mockEntityManager.save).toHaveBeenCalledTimes(2);
      expect(result.id).toBe("we-uuid");
      expect(result.note).toBe("test note");
    });

    it("utilise note null si non fourni", async () => {
      mockEntityManager.findOne.mockResolvedValue(mockUserPlant);
      mockEntityManager.save.mockResolvedValueOnce(mockUserPlant).mockResolvedValueOnce({
        ...mockWateringEvent,
        note: null,
      });
      mockEntityManager.create.mockReturnValue({ ...mockWateringEvent, note: null });

      const result = await service.water("user-uuid", "up-uuid", {}, owner);

      expect(mockEntityManager.create).toHaveBeenCalledWith(WateringEventEntity, {
        userPlantId: "up-uuid",
        note: null,
      });
      expect(result.note).toBeNull();
    });

    it("lève ForbiddenException si le demandeur n'est pas le propriétaire", async () => {
      await expect(service.water("user-uuid", "up-uuid", {}, other)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("lève NotFoundException si la UserPlant n'existe pas", async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      await expect(service.water("user-uuid", "up-uuid", {}, owner)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
