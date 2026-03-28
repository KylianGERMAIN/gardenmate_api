import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { registerUser, TEST_USER } from "../helpers/auth.helper";

describe("POST /api/v1/auth/login (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(async () => {
    await truncateAll(ds);
    await registerUser(app);
  });

  it("200 – retourne tokens + user sur identifiants valides", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send(TEST_USER)
      .expect(200);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.password).toBeUndefined();
  });

  it("401 – email inconnu", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "unknown@test.com", password: TEST_USER.password })
      .expect(401);
  });

  it("401 – mot de passe incorrect", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: TEST_USER.email, password: "WrongPass1!" })
      .expect(401);
  });

  it("400 – body invalide (email manquant)", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ password: TEST_USER.password })
      .expect(400);
  });
});
