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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Doctor, Patient, RecurringAvailability, CustomAvailability],
      synchronize: false,
    }),
    AuthModule,
    UsersModule,
    DoctorsModule,
    PatientsModule,
    DoctorAvailabilityModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}