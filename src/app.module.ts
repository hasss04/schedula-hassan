import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientsModule } from './patients/patients.module';
import { DoctorAvailabilityModule } from './doctor-availability/doctor-availability.module';
import { User } from './users/user.entity';
import { Doctor } from './doctors/doctors.entity';
import { Patient } from './patients/patients.entity';
import { RecurringAvailability } from './doctor-availability/entities/recurring-availability.entity';
import { CustomAvailability } from './doctor-availability/entities/custom-availability.entity';
import { DoctorScheduleConfig } from './doctor-scheduling/entities/doctor-schedule-config.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { DoctorSchedulingModule } from './doctor-scheduling/doctor-scheduling.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: true,
      entities: [
        User,
        Doctor,
        Patient,
        RecurringAvailability,
        CustomAvailability,
        DoctorScheduleConfig,
        Appointment,
      ],
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    DoctorsModule,
    PatientsModule,
    DoctorAvailabilityModule,
    DoctorSchedulingModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}