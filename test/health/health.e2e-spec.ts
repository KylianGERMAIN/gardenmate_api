import request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createTestApp } from "../helpers/app.helper";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(() => app.close());

  it("GET /api/health → 200, liveness publique sans token", async () => {
    const res = await request(app.getHttpServer()).get("/api/health").expect(200);

    // toMatchObject : l'intercepteur ajoute un requestId à la réponse succès.
    expect(res.body).toMatchObject({ status: "ok" });
  });

  it("GET /api/health/ready → 200, base joignable", async () => {
    const res = await request(app.getHttpServer()).get("/api/health/ready").expect(200);

    expect(res.body).toMatchObject({ status: "ok", database: "up" });
  });
});
