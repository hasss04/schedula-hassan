import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecurringAvailability } from "./entities/recurring-availability.entity";
import { CustomAvailability } from "./entities/custom-availability.entity";
import { DoctorAvailabilityService } from "./doctor-availability.service";
import { DoctorAvailabilityController } from "./doctor-availability.controller";

@Module({
  imports: [TypeOrmModule.forFeature([RecurringAvailability, CustomAvailability])],
  controllers: [DoctorAvailabilityController],
  providers: [DoctorAvailabilityService],
})
export class DoctorAvailabilityModule {}