import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctors.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorsRepository: Repository<Doctor>,
  ) {}

  async create(data: Partial<Doctor>): Promise<Doctor> {
    const doctor = this.doctorsRepository.create(data);
    return await this.doctorsRepository.save(doctor);
  }
}