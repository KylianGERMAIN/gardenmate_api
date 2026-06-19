import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { getTokens, bearer, TEST_USER } from "../helpers/auth.helper";
import { RemindersJob } from "@/modules/notifications/reminders.job";

describe("Notifications + reminders job (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;
  let job: RemindersJob;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
    job = app.get(RemindersJob);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  /** Crée un user avec une plante jamais arrosée (donc OVERDUE) dans son jardin. */
  async function setupGardenWithOverduePlant(): Promise<{ userId: string; token: string }> {
    const { userId } = await getTokens(app, TEST_USER);
    await ds.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [userId]);

    const login = await request(app.getHttpServer()).post("/api/v1/auth/login").send(TEST_USER);
    const token = login.body.accessToken as string;

    const plant = await request(app.getHttpServer())
      .post("/api/v1/plants")
      .set(bearer(token))
      .send({ name: "Ficus lyrata", sunlightLevel: "FULL_SUN", wateringFrequency: 7 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/users/${userId}/plants`)
      .set(bearer(token))
      .send({ plantId: plant.body.id as string })
      .expect(201);

    return { userId, token };
  }

  it("le job crée un rappel, idempotent au rejeu, consultable et marquable lu", async () => {
    const { userId, token } = await setupGardenWithOverduePlant();

    const first = await job.run(new Date());
    expect(first.reminders).toBe(1);

    let res = await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}/notifications`)
      .set(bearer(token))
      .expect(200);

    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe("WATERING_REMINDER");
    expect(res.body.items[0].isRead).toBe(false);
    const notificationId = res.body.items[0].id as string;

    // Rejeu le même jour → la déduplication en base empêche tout doublon.
    await job.run(new Date());
    res = await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}/notifications`)
      .set(bearer(token))
      .expect(200);
    expect(res.body.items).toHaveLength(1);

    // Marquer comme lue.
    const read = await request(app.getHttpServer())
      .patch(`/api/v1/users/${userId}/notifications/${notificationId}/read`)
      .set(bearer(token))
      .expect(200);
    expect(read.body.isRead).toBe(true);
  });

  it("403 – un autre user ne voit pas les notifications d'autrui", async () => {
    const { userId } = await setupGardenWithOverduePlant();
    const { accessToken: otherToken } = await getTokens(app, {
      email: "other@test.com",
      password: "Abcd1234!",
    });

    await request(app.getHttpServer())
      .get(`/api/v1/users/${userId}/notifications`)
      .set(bearer(otherToken))
      .expect(403);
  });
});
