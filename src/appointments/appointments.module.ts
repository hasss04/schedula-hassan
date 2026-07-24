import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../doctors/doctors.entity';
import { User } from '../users/user.entity';
import { RecurringAvailability } from '../doctor-availability/entities/recurring-availability.entity';
import { CustomAvailability } from '../doctor-availability/entities/custom-availability.entity';
import { DoctorScheduleConfig } from '../doctor-scheduling/entities/doctor-schedule-config.entity';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      Doctor,
      User,
      RecurringAvailability,
      CustomAvailability,
      DoctorScheduleConfig,
    ]),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}