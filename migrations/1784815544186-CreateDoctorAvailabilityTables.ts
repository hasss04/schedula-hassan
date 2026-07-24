import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDoctorAvailabilityTables1721600000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "day_of_week_enum" AS ENUM (
        'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "recurring_availability" (
        "id" SERIAL NOT NULL,
        "doctor_id" integer NOT NULL,
        "day_of_week" "day_of_week_enum" NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recurring_availability" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recurring_availability_doctor" FOREIGN KEY ("doctor_id")
          REFERENCES "doctor_profiles"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_recurring_availability_doctor_day"
      ON "recurring_availability" ("doctor_id", "day_of_week");
    `);

    await queryRunner.query(`
      CREATE TABLE "custom_availability" (
        "id" SERIAL NOT NULL,
        "doctor_id" integer NOT NULL,
        "date" date NOT NULL,
        "start_time" time NOT NULL,
        "end_time" time NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_availability" PRIMARY KEY ("id"),
        CONSTRAINT "FK_custom_availability_doctor" FOREIGN KEY ("doctor_id")
          REFERENCES "doctor_profiles"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_custom_availability_doctor_date"
      ON "custom_availability" ("doctor_id", "date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "custom_availability";`);
    await queryRunner.query(`DROP TABLE "recurring_availability";`);
    await queryRunner.query(`DROP TYPE "day_of_week_enum";`);
  }
}