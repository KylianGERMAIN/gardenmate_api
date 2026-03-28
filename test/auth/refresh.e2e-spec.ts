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
});
