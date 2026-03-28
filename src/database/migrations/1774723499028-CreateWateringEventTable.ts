import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWateringEventTable1774723499028 implements MigrationInterface {
    name = 'CreateWateringEventTable1774723499028'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "watering_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_plant_id" uuid NOT NULL, "watered_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "note" character varying(500), CONSTRAINT "PK_7e716e76247251f3259489f3a4c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c15b9f4ecb786817d306ff6c04" ON "watering_events" ("user_plant_id") `);
        await queryRunner.query(`ALTER TABLE "watering_events" ADD CONSTRAINT "FK_c15b9f4ecb786817d306ff6c043" FOREIGN KEY ("user_plant_id") REFERENCES "user_plants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "watering_events" DROP CONSTRAINT "FK_c15b9f4ecb786817d306ff6c043"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c15b9f4ecb786817d306ff6c04"`);
        await queryRunner.query(`DROP TABLE "watering_events"`);
    }

}
