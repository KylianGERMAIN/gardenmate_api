import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { getTokens, bearer, TEST_USER } from "../helpers/auth.helper";

/** Crée un token ADMIN + un id de plante pour les tests. */
async function setupAdminAndPlant(
  app: INestApplication,
  ds: DataSource,
): Promise<{ adminToken: string; adminId: string; plantId: string }> {
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

  return { adminToken, adminId, plantId: plantRes.body.id as string };
}

describe("UserPlantsController (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  // ─── POST /api/v1/users/:userId/plants ───────────────────────────────────

  describe("POST /api/v1/users/:userId/plants", () => {
    it("201 – propriétaire ajoute une plante à son jardin", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.plant.id).toBe(plantId);
    });

    it("403 – un autre user ne peut pas ajouter au jardin d'autrui", async () => {
      const { adminId, plantId } = await setupAdminAndPlant(app, ds);
      const { accessToken: otherToken } = await getTokens(app, {
        email: "other@test.com",
        password: "Abcd1234!",
      });

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(otherToken))
        .send({ plantId })
        .expect(403);
    });

    it("401 – sans token", async () => {
      const { adminId, plantId } = await setupAdminAndPlant(app, ds);

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .send({ plantId })
        .expect(401);
    });
  });

  // ─── GET /api/v1/users/:userId/plants ────────────────────────────────────

  describe("GET /api/v1/users/:userId/plants", () => {
    it("200 – retourne les plantes du jardin du propriétaire", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].plant.id).toBe(plantId);
    });

    it("403 – autre user ne peut pas lister le jardin d'autrui", async () => {
      const { adminId } = await setupAdminAndPlant(app, ds);
      const { accessToken: otherToken } = await getTokens(app, {
        email: "other@test.com",
        password: "Abcd1234!",
      });

      await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}/plants`)
        .set(bearer(otherToken))
        .expect(403);
    });

    it("200 – admin peut lister le jardin d'un autre user", async () => {
      const { adminToken, plantId } = await setupAdminAndPlant(app, ds);
      const { accessToken: ownerToken, userId: ownerId } = await getTokens(app, {
        email: "owner2@test.com",
        password: "Abcd1234!",
      });

      // L'owner ajoute la plante à son propre jardin
      await request(app.getHttpServer())
        .post(`/api/v1/users/${ownerId}/plants`)
        .set(bearer(ownerToken))
        .send({ plantId })
        .expect(201);

      // L'admin lit le jardin de l'owner
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${ownerId}/plants`)
        .set(bearer(adminToken))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].plant.id).toBe(plantId);
    });
  });

  // ─── GET /api/v1/users/:userId/plants/needing-water ──────────────────────

  describe("GET /api/v1/users/:userId/plants/needing-water", () => {
    it("200 – retourne les plantes nécessitant un arrosage", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}/plants/needing-water`)
        .set(bearer(adminToken))
        .expect(200);

      // Jamais arrosée + wateringFrequency = 7 → doit avoir besoin d'eau
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
    });
  });

  // ─── GET /api/v1/users/:userId/plants/care-plan ──────────────────────────

  describe("GET /api/v1/users/:userId/plants/care-plan", () => {
    it("200 – plante jamais arrosée → OVERDUE avec facteurs et intervalle", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}/plants/care-plan`)
        .set(bearer(adminToken))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe("OVERDUE");
      expect(res.body[0].plantName).toBe("Ficus lyrata");
      expect(res.body[0].adjustedIntervalDays).toBeGreaterThan(0);
      // Sans géoloc sur l'utilisateur → repli saisonnier, pas d'appel réseau.
      expect(res.body[0].factors).toEqual(
        expect.objectContaining({
          demand: expect.any(Number),
          exposure: expect.any(Number),
          source: "season",
        }),
      );
    });

    it("403 – autre user ne peut pas voir le plan de soin d'autrui", async () => {
      const { adminId } = await setupAdminAndPlant(app, ds);
      const { accessToken: otherToken } = await getTokens(app, {
        email: "other@test.com",
        password: "Abcd1234!",
      });

      await request(app.getHttpServer())
        .get(`/api/v1/users/${adminId}/plants/care-plan`)
        .set(bearer(otherToken))
        .expect(403);
    });
  });

  // ─── PATCH /api/v1/users/:userId/plants/:userPlantId ─────────────────────

  describe("PATCH /api/v1/users/:userId/plants/:userPlantId", () => {
    it("200 – propriétaire met à jour les dates de sa plante", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      const userPlantId = createRes.body.id as string;
      const newDate = "2026-01-15T10:00:00.000Z";

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminId}/plants/${userPlantId}`)
        .set(bearer(adminToken))
        .send({ lastWateredAt: newDate })
        .expect(200);

      expect(new Date(res.body.lastWateredAt as string).toISOString()).toBe(newDate);
    });

    it("403 – autre user ne peut pas modifier la plante d'autrui", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      const userPlantId = createRes.body.id as string;
      const { accessToken: otherToken } = await getTokens(app, {
        email: "other@test.com",
        password: "Abcd1234!",
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/users/${adminId}/plants/${userPlantId}`)
        .set(bearer(otherToken))
        .send({ lastWateredAt: new Date().toISOString() })
        .expect(403);
    });
  });

  // ─── DELETE /api/v1/users/:userId/plants/:userPlantId ────────────────────

  describe("DELETE /api/v1/users/:userId/plants/:userPlantId", () => {
    it("200 – propriétaire retire une plante de son jardin", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      const userPlantId = createRes.body.id as string;

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/${adminId}/plants/${userPlantId}`)
        .set(bearer(adminToken))
        .expect(200);

      expect(res.body.id).toBe(userPlantId);
    });

    it("403 – autre user ne peut pas retirer la plante d'autrui", async () => {
      const { adminToken, adminId, plantId } = await setupAdminAndPlant(app, ds);

      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/users/${adminId}/plants`)
        .set(bearer(adminToken))
        .send({ plantId })
        .expect(201);

      const userPlantId = createRes.body.id as string;
      const { accessToken: otherToken } = await getTokens(app, {
        email: "other@test.com",
        password: "Abcd1234!",
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${adminId}/plants/${userPlantId}`)
        .set(bearer(otherToken))
        .expect(403);
    });
  });
});
