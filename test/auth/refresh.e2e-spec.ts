import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { getTokens } from "../helpers/auth.helper";

describe("POST /api/v1/auth/refresh (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  it("200 – retourne une nouvelle paire de tokens avec un refresh token valide", async () => {
    const { refreshToken } = await getTokens(app);

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user).toBeDefined();
  });

  it("401 – refresh token invalide", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: "invalid.jwt.token" })
      .expect(401);
  });

  it("401 – refresh token manquant", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({})
      .expect(400);
  });

  it("rotation : l'ancien token est consommé, sa réutilisation révoque la famille", async () => {
    const { refreshToken } = await getTokens(app);

    // 1er refresh → nouvelle paire, l'ancien token est consommé.
    const rotated = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);
    const newRefresh = rotated.body.refreshToken as string;
    expect(newRefresh).not.toBe(refreshToken);

    // Réutiliser l'ANCIEN token → 401 (réutilisation détectée).
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);

    // La détection a fait tomber toute la famille : le nouveau token est révoqué aussi.
    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: newRefresh })
      .expect(401);
  });

  it("logout révoque le refresh token (204), un refresh ultérieur échoue", async () => {
    const { refreshToken } = await getTokens(app);

    await request(app.getHttpServer())
      .post("/api/v1/auth/logout")
      .send({ refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });
});
