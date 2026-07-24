import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './doctors.entity';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor) private readonly repo: Repository<Doctor>,
  ) {}

  async create(userId: number, dto: CreateDoctorProfileDto) {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) throw new BadRequestException('Doctor profile already exists');
    const doctor = this.repo.create({ userId, ...dto });
    return this.repo.save(doctor);
  }

  async getByUserId(userId: number) {
    const doctor = await this.repo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return doctor;
  }

  async update(userId: number, dto: UpdateDoctorProfileDto) {
    const doctor = await this.repo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    Object.assign(doctor, dto);
    return this.repo.save(doctor);
  }
}