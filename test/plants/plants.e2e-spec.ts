import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { getTokens, bearer, TEST_USER } from "../helpers/auth.helper";

const PLANT_PAYLOAD = {
  name: "Ficus lyrata",
  sunlightLevel: "FULL_SUN",
  wateringFrequency: 7,
};

/** Crée un token ADMIN en forçant le rôle en DB puis en re-loginant. */
async function getAdminTokens(
  app: INestApplication,
  ds: DataSource,
): Promise<{ accessToken: string }> {
  const { userId } = await getTokens(app, TEST_USER);
  await ds.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [userId]);

  const res = await request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send(TEST_USER);

  return { accessToken: res.body.accessToken as string };
}

describe("PlantsController (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  // ─── GET /api/v1/plants ───────────────────────────────────────────────────

  describe("GET /api/v1/plants", () => {
    it("200 – retourne la liste (vide au départ)", async () => {
      const { accessToken } = await getTokens(app);

      const res = await request(app.getHttpServer())
        .get("/api/v1/plants")
        .set(bearer(accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("200 – filtre par nom (query ?name=)", async () => {
      const { accessToken } = await getAdminTokens(app, ds);

      await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send(PLANT_PAYLOAD);

      await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send({ name: "Rose", sunlightLevel: "PARTIAL_SHADE" });

      const res = await request(app.getHttpServer())
        .get("/api/v1/plants?name=fic")
        .set(bearer(accessToken))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Ficus lyrata");
    });

    it("401 – sans token", async () => {
      await request(app.getHttpServer()).get("/api/v1/plants").expect(401);
    });
  });

  // ─── POST /api/v1/plants ──────────────────────────────────────────────────

  describe("POST /api/v1/plants", () => {
    it("201 – admin crée une plante", async () => {
      const { accessToken } = await getAdminTokens(app, ds);

      const res = await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send(PLANT_PAYLOAD)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(PLANT_PAYLOAD.name);
      expect(res.body.wateringFrequency).toBe(PLANT_PAYLOAD.wateringFrequency);
    });

    it("403 – user (non admin) ne peut pas créer", async () => {
      const { accessToken } = await getTokens(app);

      await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send(PLANT_PAYLOAD)
        .expect(403);
    });

    it("409 – nom déjà existant", async () => {
      const { accessToken } = await getAdminTokens(app, ds);

      await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send(PLANT_PAYLOAD);

      await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send(PLANT_PAYLOAD)
        .expect(409);
    });

    it("400 – body invalide (sunlightLevel manquant)", async () => {
      const { accessToken } = await getAdminTokens(app, ds);

      await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send({ name: "Rose" })
        .expect(400);
    });

    it("401 – sans token", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/plants")
        .send(PLANT_PAYLOAD)
        .expect(401);
    });
  });

  // ─── DELETE /api/v1/plants/:id ────────────────────────────────────────────

  describe("DELETE /api/v1/plants/:id", () => {
    it("200 – admin supprime une plante", async () => {
      const { accessToken } = await getAdminTokens(app, ds);

      const createRes = await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(accessToken))
        .send(PLANT_PAYLOAD)
        .expect(201);

      const plantId = createRes.body.id as string;

      const delRes = await request(app.getHttpServer())
        .delete(`/api/v1/plants/${plantId}`)
        .set(bearer(accessToken))
        .expect(200);

      expect(delRes.body.id).toBe(plantId);
    });

    it("403 – user (non admin) ne peut pas supprimer", async () => {
      const { accessToken: adminToken } = await getAdminTokens(app, ds);

      const createRes = await request(app.getHttpServer())
        .post("/api/v1/plants")
        .set(bearer(adminToken))
        .send(PLANT_PAYLOAD)
        .expect(201);

      const plantId = createRes.body.id as string;

      // Créer un second user (non admin)
      const { accessToken: userToken } = await getTokens(app, {
        email: "user2@test.com",
        password: "Abcd1234!",
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/plants/${plantId}`)
        .set(bearer(userToken))
        .expect(403);
    });

    it("404 – plante inexistante", async () => {
      const { accessToken } = await getAdminTokens(app, ds);

      await request(app.getHttpServer())
        .delete("/api/v1/plants/00000000-0000-0000-0000-000000000000")
        .set(bearer(accessToken))
        .expect(404);
    });
  });
});
