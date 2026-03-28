import * as path from "path";
import { execSync } from "child_process";

// Charge .env.test AVANT tout import qui lirait process.env
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: path.resolve(__dirname, "../.env.test"), override: true });

export default async function globalSetup() {
  const { Client } = await import("pg");

  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  // Connexion à la DB dev pour créer gardenmate_test si inexistante
  const adminClient = new Client({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: "gardenmate",
  });

  await adminClient.connect();

  try {
    await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
    console.log(`\n✓ Base de test créée : ${DB_NAME}`);
  } catch (err: unknown) {
    const pg = err as { code?: string };
    if (pg.code !== "42P04") {
      await adminClient.end();
      throw err;
    }
  }

  await adminClient.end();

  // Applique les migrations via le CLI TypeORM (évite les problèmes ESM/CJS)
  execSync("pnpm run migration:run", {
    env: { ...process.env, NODE_ENV: "test" },
    stdio: "pipe",
    cwd: path.resolve(__dirname, ".."),
  });

  console.log("✓ Migrations appliquées sur gardenmate_test\n");
}
