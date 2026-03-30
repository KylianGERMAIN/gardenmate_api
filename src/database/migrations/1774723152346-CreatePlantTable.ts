import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlantTable1774723152346 implements MigrationInterface {
    name = 'CreatePlantTable1774723152346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."plants_sunlight_level_enum" AS ENUM('FULL_SUN', 'PARTIAL_SHADE', 'SHADE')`);
        await queryRunner.query(`CREATE TABLE "plants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "sunlight_level" "public"."plants_sunlight_level_enum" NOT NULL, "watering_frequency" integer, CONSTRAINT "UQ_a0e74d7a6978b7a7bc792c59095" UNIQUE ("name"), CONSTRAINT "PK_7056d6b283b48ee2bb0e53bee60" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "plants"`);
        await queryRunner.query(`DROP TYPE "public"."plants_sunlight_level_enum"`);
    }

}
