import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patients.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientsRepository: Repository<Patient>,
  ) {}

  async create(data: Partial<Patient>): Promise<Patient> {
    const patient = this.patientsRepository.create(data);
    return await this.patientsRepository.save(patient);
  }
}