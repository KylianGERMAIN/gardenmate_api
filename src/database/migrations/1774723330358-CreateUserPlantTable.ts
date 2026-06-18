import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserPlantTable1774723330358 implements MigrationInterface {
    name = 'CreateUserPlantTable1774723330358'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_plants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "plant_id" uuid NOT NULL, "planted_at" TIMESTAMP WITH TIME ZONE, "last_watered_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6cc151832f8a87441c553b6bf16" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f0aa8a0d2afa4c0730978f872c" ON "user_plants" ("user_id") `);
        await queryRunner.query(`ALTER TABLE "user_plants" ADD CONSTRAINT "FK_f0aa8a0d2afa4c0730978f872c8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_plants" ADD CONSTRAINT "FK_6f834817d2f4d6536c53a6fc5ff" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_plants" DROP CONSTRAINT "FK_6f834817d2f4d6536c53a6fc5ff"`);
        await queryRunner.query(`ALTER TABLE "user_plants" DROP CONSTRAINT "FK_f0aa8a0d2afa4c0730978f872c8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f0aa8a0d2afa4c0730978f872c"`);
        await queryRunner.query(`DROP TABLE "user_plants"`);
    }

}
