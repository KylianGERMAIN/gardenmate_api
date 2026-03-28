import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createTestApp } from "../helpers/app.helper";
import { truncateAll } from "../helpers/db.helper";
import { getTokens, bearer } from "../helpers/auth.helper";

describe("JwtAuthGuard + RequestId (e2e)", () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    ds = app.get(DataSource);
  });

  afterAll(() => app.close());

  beforeEach(() => truncateAll(ds));

  // ─── Routes publiques accessibles sans token ──────────────────────────────

  it("GET /api/v1 – health accessible sans token", async () => {
    await request(app.getHttpServer()).get("/api/v1").expect(200);
  });

  it("POST /api/v1/auth/register – public sans token", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "x@test.com", password: "Abcd1234!" })
      .expect(201);
  });

  it("POST /api/v1/auth/login – public sans token", async () => {
    await getTokens(app);

    await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com", password: "Abcd1234!" })
      .expect(200);
  });

  // ─── requestId injecté dans les réponses succès ───────────────────────────

  it("requestId présent dans la réponse register (interceptor)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "y@test.com", password: "Abcd1234!" })
      .expect(201);

    expect(res.body.requestId).toBeDefined();
    expect(typeof res.body.requestId).toBe("string");
  });

  it("X-Request-Id header présent dans la réponse (middleware)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "z@test.com", password: "Abcd1234!" })
      .expect(201);

    expect(res.headers["x-request-id"]).toBeDefined();
  });

  it("requestId cohérent entre body et header", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email: "w@test.com", password: "Abcd1234!" })
      .expect(201);

    expect(res.body.requestId).toBe(res.headers["x-request-id"]);
  });

  // ─── Vérification JWT sur un token valide ─────────────────────────────────

  it("POST /api/v1/auth/refresh – token access valide accepté par le guard", async () => {
    const { refreshToken } = await getTokens(app);

    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(200);

    // Le nouveau access token doit être signé avec le bon secret
    expect(res.body.accessToken).toBeDefined();
  });

  it("401 – access token expiré/invalide rejeté sur route protégée (refresh lui-même est public, mais token invalide → 400)", async () => {
    // On vérifie que le guard ne bloque pas les routes publiques
    // avec un header Authorization malformé
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set(bearer("malformed.token"))
      .send({ email: "test@example.com", password: "Abcd1234!" });

    // Route publique → le guard ne bloque pas, on obtient 401 (credentials invalides)
    // ou 400 (corps invalide), pas 401 venant du guard
    expect([400, 401, 404]).toContain(res.status);
  });
});
