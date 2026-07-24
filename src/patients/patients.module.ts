import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient } from './patients.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  controllers: [PatientController],
  providers: [PatientsService],
})
export class PatientsModule {}