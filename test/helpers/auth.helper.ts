import request from "supertest";
import { INestApplication } from "@nestjs/common";

export const TEST_USER = { email: "test@example.com", password: "Abcd1234!" };
export const TEST_ADMIN = { email: "admin@example.com", password: "Admin5678!" };

/** Inscrit un utilisateur et retourne la réponse complète. */
export function registerUser(
  app: INestApplication,
  user = TEST_USER,
): request.Test {
  return request(app.getHttpServer())
    .post("/api/v1/auth/register")
    .send(user);
}

/** Connecte un utilisateur et retourne la réponse complète. */
export function loginUser(
  app: INestApplication,
  user = TEST_USER,
): request.Test {
  return request(app.getHttpServer())
    .post("/api/v1/auth/login")
    .send(user);
}

/** Inscrit puis connecte un utilisateur, retourne ses tokens. */
export async function getTokens(
  app: INestApplication,
  user = TEST_USER,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const res = await registerUser(app, user);
  return {
    accessToken: res.body.accessToken as string,
    refreshToken: res.body.refreshToken as string,
    userId: res.body.user.id as string,
  };
}

/** En-tête Authorization Bearer. */
export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
