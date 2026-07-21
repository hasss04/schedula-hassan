import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './patients.entity';
import { PatientsService } from './patients.service';
import { PatientController } from './patients.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  controllers: [PatientController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}