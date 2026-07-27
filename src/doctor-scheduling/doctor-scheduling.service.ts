import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorScheduleConfig } from './entities/doctor-schedule-config.entity';
import { Doctor } from '../doctors/doctors.entity';
import { CreateDoctorScheduleConfigDto } from './dto/create-doctor-schedule-config.dto';
import { UpdateDoctorScheduleConfigDto } from './dto/update-doctor-schedule-config.dto';
import { SchedulingType } from './enums/scheduling-type.enum';

@Injectable()
export class DoctorSchedulingService {
  constructor(
    @InjectRepository(DoctorScheduleConfig)
    private readonly configRepository: Repository<DoctorScheduleConfig>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  private validateConfig(dto: {
    schedulingType?: SchedulingType;
    slotDuration?: number | null;
    bufferTime?: number | null;
    maxCapacity?: number | null;
  }) {
    if (!dto.schedulingType) {
      throw new BadRequestException('schedulingType is required');
    }

    if (dto.schedulingType === SchedulingType.STREAM) {
      if (dto.slotDuration !== undefined && dto.slotDuration !== null) {
        throw new BadRequestException(
          'slotDuration is not allowed for STREAM scheduling',
        );
      }

      if (
        dto.maxCapacity !== undefined &&
        dto.maxCapacity !== null
      ) {
        throw new BadRequestException(
          'maxCapacity is not allowed for STREAM scheduling',
        );
      }

      if (
        dto.bufferTime !== undefined &&
        dto.bufferTime !== null &&
        dto.bufferTime < 0
      ) {
        throw new BadRequestException('bufferTime cannot be negative');
      }
    }

    if (dto.schedulingType === SchedulingType.WAVE) {
      if (!dto.slotDuration || dto.slotDuration <= 0) {
        throw new BadRequestException(
          'slotDuration is required and must be greater than 0 for WAVE scheduling',
        );
      }

      if (!dto.maxCapacity || dto.maxCapacity <= 0) {
        throw new BadRequestException(
          'maxCapacity is required and must be greater than 0 for WAVE scheduling',
        );
      }

      if (
        dto.bufferTime !== undefined &&
        dto.bufferTime !== null
      ) {
        throw new BadRequestException(
          'bufferTime is not allowed for WAVE scheduling',
        );
      }
    }
  }

  async createForDoctor(userId: number, dto: CreateDoctorScheduleConfigDto) {
    if (!userId) {
      throw new BadRequestException('Invalid authenticated user');
    }

    const doctor = await this.doctorRepository.findOne({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const existing = await this.configRepository.findOne({
      where: { doctorId: doctor.id },
    });

    if (existing) {
      throw new BadRequestException(
        'Scheduling config already exists for this doctor',
      );
    }

    this.validateConfig(dto);

    const config = this.configRepository.create({
      doctorId: doctor.id,
      schedulingType: dto.schedulingType,
      slotDuration:
        dto.schedulingType === SchedulingType.WAVE
          ? dto.slotDuration ?? null
          : null,
      bufferTime:
        dto.schedulingType === SchedulingType.STREAM
          ? dto.bufferTime ?? 0
          : null,
      maxCapacity:
        dto.schedulingType === SchedulingType.WAVE
          ? dto.maxCapacity ?? null
          : null,
    });

    return this.configRepository.save(config);
  }

  async getForDoctor(userId: number) {
    if (!userId) {
      throw new BadRequestException('Invalid authenticated user');
    }

    const doctor = await this.doctorRepository.findOne({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const config = await this.configRepository.findOne({
      where: { doctorId: doctor.id },
    });

    if (!config) {
      throw new NotFoundException('Scheduling config not found');
    }

    return config;
  }

  async updateForDoctor(userId: number, dto: UpdateDoctorScheduleConfigDto) {
    if (!userId) {
      throw new BadRequestException('Invalid authenticated user');
    }

    const doctor = await this.doctorRepository.findOne({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const config = await this.configRepository.findOne({
      where: { doctorId: doctor.id },
    });

    if (!config) {
      throw new NotFoundException('Scheduling config not found');
    }

    const nextSchedulingType = dto.schedulingType ?? config.schedulingType;

    const merged: {
      schedulingType: SchedulingType;
      slotDuration: number | null;
      bufferTime: number | null;
      maxCapacity: number | null;
    } = {
      schedulingType: nextSchedulingType,
      slotDuration:
        nextSchedulingType === SchedulingType.WAVE
          ? dto.slotDuration !== undefined
            ? dto.slotDuration
            : config.slotDuration
          : null,
      bufferTime:
        nextSchedulingType === SchedulingType.STREAM
          ? dto.bufferTime !== undefined
            ? dto.bufferTime
            : config.bufferTime
          : null,
      maxCapacity:
        nextSchedulingType === SchedulingType.WAVE
          ? dto.maxCapacity !== undefined
            ? dto.maxCapacity
            : config.maxCapacity
          : null,
    };

    this.validateConfig(merged);

    config.schedulingType = merged.schedulingType;
    config.slotDuration = merged.slotDuration;
    config.bufferTime = merged.bufferTime;
    config.maxCapacity = merged.maxCapacity;

    return this.configRepository.save(config);
  }
}