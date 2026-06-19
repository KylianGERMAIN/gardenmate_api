import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotificationsService } from "./notifications.service";
import { NotificationEntity, NotificationType } from "./entities/notification.entity";
import { UserPlantEntity } from "@/modules/user-plants/entities/user-plant.entity";
import { UserRole } from "@/modules/users/entities/user.entity";
import type { JwtAccessPayload } from "@/modules/token/interfaces/jwt-payload.interface";

const owner: JwtAccessPayload = { sub: "user-uuid", email: "k@test.com", role: UserRole.USER };
const admin: JwtAccessPayload = { sub: "admin-uuid", email: "a@test.com", role: UserRole.ADMIN };
const other: JwtAccessPayload = { sub: "other-uuid", email: "o@test.com", role: UserRole.USER };

const userPlant = { id: "up-uuid", plant: { name: "Rose" } } as UserPlantEntity;
const NOW = new Date("2026-07-15T08:00:00.000Z");

const mockRepo = {
  create: jest.fn((x: unknown) => x),
  save: jest.fn(),
  findAndCount: jest.fn(),
  findOne: jest.fn(),
};

const PAGINATION = { page: 1, limit: 20 };

describe("NotificationsService", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(NotificationEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
    mockRepo.create.mockImplementation((x: unknown) => x);
  });

  describe("createWateringReminder", () => {
    it("crée un rappel avec une clé d'idempotence datée", async () => {
      mockRepo.save.mockResolvedValue({});

      await service.createWateringReminder("user-uuid", userPlant, NOW);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-uuid",
          userPlantId: "up-uuid",
          type: NotificationType.WATERING_REMINDER,
          dedupeKey: "watering:up-uuid:2026-07-15",
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it("ignore un doublon (contrainte unique 23505) sans lever", async () => {
      mockRepo.save.mockRejectedValue({ code: "23505" });

      await expect(
        service.createWateringReminder("user-uuid", userPlant, NOW),
      ).resolves.toBeUndefined();
    });

    it("propage les autres erreurs", async () => {
      mockRepo.save.mockRejectedValue({ code: "08006" });

      await expect(service.createWateringReminder("user-uuid", userPlant, NOW)).rejects.toEqual({
        code: "08006",
      });
    });
  });

  describe("findAll", () => {
    it("retourne une page de notifications du propriétaire", async () => {
      mockRepo.findAndCount.mockResolvedValue([
        [{ id: "n1", type: NotificationType.WATERING_REMINDER }],
        1,
      ]);

      const res = await service.findAll("user-uuid", owner, PAGINATION);

      expect(res.items).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it("autorise l'admin", async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const res = await service.findAll("user-uuid", admin, PAGINATION);

      expect(res.items).toEqual([]);
    });

    it("refuse un autre utilisateur", async () => {
      await expect(service.findAll("user-uuid", other, PAGINATION)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("markAsRead", () => {
    it("marque la notification comme lue", async () => {
      mockRepo.findOne.mockResolvedValue({ id: "n1", userId: "user-uuid", isRead: false });
      mockRepo.save.mockImplementation((n: NotificationEntity) => Promise.resolve(n));

      const res = await service.markAsRead("user-uuid", "n1", owner);

      expect(res.isRead).toBe(true);
    });

    it("404 si la notification est introuvable", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.markAsRead("user-uuid", "n1", owner)).rejects.toThrow(NotFoundException);
    });

    it("refuse un autre utilisateur", async () => {
      await expect(service.markAsRead("user-uuid", "n1", other)).rejects.toThrow(ForbiddenException);
    });
  });
});
