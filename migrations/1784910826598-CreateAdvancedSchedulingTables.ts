import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdvancedSchedulingTables1784910826598 implements MigrationInterface {
    name = 'CreateAdvancedSchedulingTables1784910826598'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "doctor_schedule_configs" (
                "id" SERIAL NOT NULL,
                "doctor_id" integer NOT NULL,
                "scheduling_type" character varying(20) NOT NULL,
                "slot_duration" integer,
                "buffer_time" integer DEFAULT 0,
                "max_capacity" integer,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_doctor_schedule_configs_doctor_id" UNIQUE ("doctor_id"),
                CONSTRAINT "PK_doctor_schedule_configs_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            ALTER TABLE "doctor_schedule_configs"
            ADD CONSTRAINT "FK_doctor_schedule_configs_doctor"
            FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            CREATE TABLE "appointments" (
                "id" SERIAL NOT NULL,
                "doctor_id" integer NOT NULL,
                "patient_id" integer NOT NULL,
                "appointment_date" date NOT NULL,
                "scheduling_type" character varying(20) NOT NULL,
                "start_time" TIME,
                "end_time" TIME,
                "wave_window_start" TIME,
                "wave_window_end" TIME,
                "token_number" integer,
                "status" character varying(20) NOT NULL DEFAULT 'BOOKED',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_appointments_doctor_date"
            ON "appointments" ("doctor_id", "appointment_date")
        `);

        await queryRunner.query(`
            ALTER TABLE "appointments"
            ADD CONSTRAINT "FK_appointments_doctor"
            FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "appointments"
            ADD CONSTRAINT "FK_appointments_patient"
            FOREIGN KEY ("patient_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_patient"
        `);

        await queryRunner.query(`
            ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_doctor"
        `);

        await queryRunner.query(`
            DROP INDEX "public"."IDX_appointments_doctor_date"
        `);

        await queryRunner.query(`
            DROP TABLE "appointments"
        `);

        await queryRunner.query(`
            ALTER TABLE "doctor_schedule_configs" DROP CONSTRAINT "FK_doctor_schedule_configs_doctor"
        `);

        await queryRunner.query(`
            DROP TABLE "doctor_schedule_configs"
        `);
    }
}