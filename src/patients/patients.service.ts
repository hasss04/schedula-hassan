import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './patients.entity';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private readonly repo: Repository<Patient>,
  ) {}

  async create(userId: number, dto: CreatePatientProfileDto) {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) throw new BadRequestException('Patient profile already exists');
    const patient = this.repo.create({ userId, ...dto });
    return this.repo.save(patient);
  }

  async getByUserId(userId: number) {
    const patient = await this.repo.findOne({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient profile not found');
    return patient;
  }

  async update(userId: number, dto: UpdatePatientProfileDto) {
    const patient = await this.repo.findOne({ where: { userId } });
    if (!patient) throw new NotFoundException('Patient profile not found');
    Object.assign(patient, dto);
    return this.repo.save(patient);
  }
}