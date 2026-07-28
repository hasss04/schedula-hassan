import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorScheduleConfig } from './entities/doctor-schedule-config.entity';
import { Doctor } from '../doctors/doctors.entity';
import { DoctorSchedulingService } from './doctor-scheduling.service';
import { DoctorSchedulingController } from './doctor-scheduling.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorScheduleConfig, Doctor])],
  controllers: [DoctorSchedulingController],
  providers: [DoctorSchedulingService],
  exports: [DoctorSchedulingService],
})
export class DoctorSchedulingModule {}