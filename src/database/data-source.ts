import "reflect-metadata";
import { DataSource } from "typeorm";
import { ConfigModule } from "@nestjs/config";

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";

void ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: envFile,
});

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.EXTERNAL_DB_PORT) || 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + "/../**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
});
