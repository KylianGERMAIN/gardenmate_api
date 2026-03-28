import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { getTokens, bearer, TEST_USER } from "../helpers/auth.helper";

/** Crée un admin avec une plante assignée à son jardin et retourne les IDs utiles. */
async function setupGarden(
  app: INestApplication,
  ds: DataSource,
): Promise<{
  adminToken: string;
  adminId: string;
  userPlantId: string;
}> {
  const { userId: adminId } = await getTokens(app, TEST_USER);
  await ds.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [adminId]);

  const loginRes = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send(TEST_USER);

  const adminToken = loginRes.body.accessToken as string;

  const plantRes = await request(app.getHttpServer())
    .post("/api/v1/plants")
    .set(bearer(adminToken))
    .send({ name: "Ficus lyrata", sunlightLevel: "FULL_SUN", wateringFrequency: 7 })
    .expect(201);

  const plantId = plantRes.body.id as string;

  const userPlantRes = await request(app.getHttpServer())
    .post(`/api/v1/users/${adminId}/plants`)
    .set(bearer(adminToken))
    .send({ plantId })
    .expect(201);

  return { adminToken, adminId, userPlantId: userPlantRes.body.id as string };
}

describe("WateringEventsController (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  describe("POST /api/v1/users/:userId/plants/:userPlantId/water", () => {
    it("201 – propriétaire arrose sa plante (crée un WateringEvent + met à jour lastWateredAt)", async () => {
      const { adminToken, adminId, userPlantId } = await setupGarden(app, ds);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants/${userPlantId}/water`)
        .set(bearer(adminToken))
        .send({})
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.userPlantId).toBe(userPlantId);
      expect(res.body.wateredAt).toBeDefined();

      // Vérifier que lastWateredAt est mis à jour en DB
      const [userPlant] = await ds.query<{ last_watered_at: string }[]>(
        `SELECT last_watered_at FROM user_plants WHERE id = $1`,
        [userPlantId],
      );
      expect(userPlant.last_watered_at).not.toBeNull();
    });

    it("201 – avec une note optionnelle", async () => {
      const { adminToken, adminId, userPlantId } = await setupGarden(app, ds);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants/${userPlantId}/water`)
        .set(bearer(adminToken))
        .send({ note: "Arrosage après les vacances" })
        .expect(201);

      expect(res.body.note).toBe("Arrosage après les vacances");
    });

    it("après arrosage, la plante n'apparaît plus dans needing-water", async () => {
      const { adminToken, adminId, userPlantId } = await setupGarden(app, ds);

      // Avant arrosage : la plante a besoin d'eau (jamais arrosée)
      const before = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}/plants/needing-water`)
        .set(bearer(adminToken))
        .expect(200);

      expect(before.body).toHaveLength(1);

      // Arrosage
      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants/${userPlantId}/water`)
        .set(bearer(adminToken))
        .send({})
        .expect(201);

      // Après arrosage : plus de plante en attente d'eau
      const after = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}/plants/needing-water`)
        .set(bearer(adminToken))
        .expect(200);

      expect(after.body).toHaveLength(0);
    });

    it("403 – autre user ne peut pas arroser la plante d'autrui", async () => {
      const { adminId, userPlantId } = await setupGarden(app, ds);
      const { accessToken: otherToken } = await getTokens(app, {
        email: "other@test.com",
        password: "Abcd1234!",
      });

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants/${userPlantId}/water`)
        .set(bearer(otherToken))
        .send({})
        .expect(403);
    });

    it("404 – userPlant inexistante", async () => {
      const { adminToken, adminId } = await setupGarden(app, ds);

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants/00000000-0000-0000-0000-000000000000/water`)
        .set(bearer(adminToken))
        .send({})
        .expect(404);
    });

    it("401 – sans token", async () => {
      const { adminId, userPlantId } = await setupGarden(app, ds);

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants/${userPlantId}/water`)
        .send({})
        .expect(401);
    });
  });
});
