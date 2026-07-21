import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './doctors.entity';
import { DoctorsService } from './doctors.service';
import { DoctorController } from './doctors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor])],
  controllers: [DoctorController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}