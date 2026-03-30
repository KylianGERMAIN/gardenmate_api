import { DataSource } from "typeorm";

const ALL_TABLES = ["user_plants", "users", "plants"];

/**
 * Vide toutes les tables existantes dans la DB de test.
 * Ignore silencieusement les tables inexistantes (branches antérieures aux migrations).
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  const rows = await dataSource.query<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1)`,
    [ALL_TABLES],
  );

  if (rows.length === 0) return;

  const list = rows.map((r) => `"${r.tablename}"`).join(", ");
  await dataSource.query(`TRUNCATE TABLE ${list} CASCADE`);
}
