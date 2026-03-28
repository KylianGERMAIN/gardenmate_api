import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { getTokens, bearer, TEST_ADMIN, TEST_USER } from "../helpers/auth.helper";

describe("UsersController (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  // ─── GET /api/v1/users/:id ────────────────────────────────────────────────

  describe("GET /api/v1/users/:id", () => {
    it("200 – propriétaire accède à son propre profil", async () => {
      const { accessToken, userId } = await getTokens(app);

      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set(bearer(accessToken))
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.email).toBe(TEST_USER.email);
      expect(res.body.password).toBeUndefined();
    });

    it("403 – un user ne peut pas voir le profil d'un autre user", async () => {
      const { userId: targetId } = await getTokens(app, TEST_USER);
      const { accessToken: otherToken } = await getTokens(app, TEST_ADMIN);

      // L'admin token est en fait un USER ici (pas ADMIN en DB)
      // On crée un second user distinct
      const secondUser = { email: "second@test.com", password: "Abcd1234!" };
      const { accessToken: secondToken } = await getTokens(app, secondUser);

      await request(app.getHttpServer())
        .get(`/api/v1/users/${targetId}`)
        .set(bearer(secondToken))
        .expect(403);

      void otherToken;
    });

    it("401 – sans token", async () => {
      const { userId } = await getTokens(app);

      await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .expect(401);
    });

    it("404 – user inexistant (admin)", async () => {
      // Rendre un user ADMIN en DB, puis re-login pour obtenir un JWT avec role ADMIN
      const { userId } = await getTokens(app, TEST_USER);
      await ds.query(`UPDATE users SET role = 'ADMIN' WHERE id = $1`, [userId]);

      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send(TEST_USER);

      const adminToken = loginRes.body.accessToken as string;

      await request(app.getHttpServer())
        .get("/api/v1/users/00000000-0000-0000-0000-000000000000")
        .set(bearer(adminToken))
        .expect(404);
    });
  });

  // ─── DELETE /api/v1/users/:id ─────────────────────────────────────────────

  describe("DELETE /api/v1/users/:id", () => {
    it("200 – propriétaire peut supprimer son compte", async () => {
      const { accessToken, userId } = await getTokens(app);

      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .set(bearer(accessToken))
        .expect(200);

      expect(res.body.id).toBe(userId);

      // Le JWT reste cryptographiquement valide mais l'utilisateur n'existe plus en DB
      await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set(bearer(accessToken))
        .expect(404);
    });

    it("403 – un user ne peut pas supprimer le compte d'un autre", async () => {
      const { userId: targetId } = await getTokens(app, TEST_USER);
      const secondUser = { email: "second@test.com", password: "Abcd1234!" };
      const { accessToken: secondToken } = await getTokens(app, secondUser);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${targetId}`)
        .set(bearer(secondToken))
        .expect(403);
    });

    it("401 – sans token", async () => {
      const { userId } = await getTokens(app);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${userId}`)
        .expect(401);
    });
  });
});
