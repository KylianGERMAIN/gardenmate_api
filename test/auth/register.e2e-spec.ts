import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";

describe("POST /api/v1/auth/register (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  it("201 – crée un utilisateur et retourne tokens + user sans password", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "alice@test.com", password: "Abcd1234!" })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.email).toBe("alice@test.com");
    expect(res.body.user.password).toBeUndefined();
  });

  it("409 – email déjà enregistré", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "alice@test.com", password: "Abcd1234!" });

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "alice@test.com", password: "Abcd1234!" })
      .expect(409);
  });

  it("400 – email invalide", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "Abcd1234!" })
      .expect(400);
  });

  it("400 – password manquant", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "alice@test.com" })
      .expect(400);
  });

  it("400 – champ inconnu refusé (whitelist)", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "alice@test.com", password: "Abcd1234!", role: "ADMIN" })
      .expect(400);
  });
});
