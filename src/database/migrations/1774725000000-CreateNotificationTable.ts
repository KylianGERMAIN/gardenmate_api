import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationTable1774725000000 implements MigrationInterface {
    name = 'CreateNotificationTable1774725000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('WATERING_REMINDER')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "user_plant_id" uuid, "type" "public"."notifications_type_enum" NOT NULL, "message" character varying NOT NULL, "is_read" boolean NOT NULL DEFAULT false, "dedupe_key" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_notifications_dedupe_key" UNIQUE ("dedupe_key"), CONSTRAINT "PK_notifications" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_user_id" ON "notifications" ("user_id")`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_user_plant" FOREIGN KEY ("user_plant_id") REFERENCES "user_plants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user_plant"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notifications_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_user_id"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    }

}
