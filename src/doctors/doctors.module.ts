import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { Doctor } from './doctors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor])],
  controllers: [DoctorController],
  providers: [DoctorsService],
})
export class DoctorsModule {}