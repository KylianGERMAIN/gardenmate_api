import { Test, TestingModule } from "@nestjs/testing";
import { RemindersJob } from "./reminders.job";
import { NotificationsService } from "./notifications.service";
import { UserPlantsService } from "@/modules/user-plants/user-plants.service";
import { UserPlantEntity } from "@/modules/user-plants/entities/user-plant.entity";

const NOW = new Date("2026-07-15T08:00:00.000Z");

const mockUserPlants = {
  findUserIdsWithPlants: jest.fn(),
  collectOverdue: jest.fn(),
};
const mockNotifications = {
  createWateringReminder: jest.fn().mockResolvedValue(undefined),
};

describe("RemindersJob", () => {
  let job: RemindersJob;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersJob,
        { provide: UserPlantsService, useValue: mockUserPlants },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    job = module.get<RemindersJob>(RemindersJob);
    jest.clearAllMocks();
    mockNotifications.createWateringReminder.mockResolvedValue(undefined);
  });

  it("crée un rappel par plante en retard, pour chaque utilisateur", async () => {
    mockUserPlants.findUserIdsWithPlants.mockResolvedValue(["u1", "u2"]);
    mockUserPlants.collectOverdue.mockImplementation((userId: string) =>
      Promise.resolve(
        userId === "u1"
          ? [{ id: "up1" } as UserPlantEntity, { id: "up2" } as UserPlantEntity]
          : [],
      ),
    );

    const result = await job.run(NOW);

    expect(result).toEqual({ users: 2, reminders: 2 });
    expect(mockNotifications.createWateringReminder).toHaveBeenCalledTimes(2);
    expect(mockNotifications.createWateringReminder).toHaveBeenCalledWith(
      "u1",
      { id: "up1" },
      NOW,
    );
  });

  it("ne crée aucun rappel si personne n'a de plante en retard", async () => {
    mockUserPlants.findUserIdsWithPlants.mockResolvedValue(["u1"]);
    mockUserPlants.collectOverdue.mockResolvedValue([]);

    const result = await job.run(NOW);

    expect(result).toEqual({ users: 1, reminders: 0 });
    expect(mockNotifications.createWateringReminder).not.toHaveBeenCalled();
  });
});
