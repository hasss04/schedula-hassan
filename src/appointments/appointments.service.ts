import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { DoctorScheduleConfig } from '../doctor-scheduling/entities/doctor-schedule-config.entity';
import { SchedulingType } from '../doctor-scheduling/enums/scheduling-type.enum';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(DoctorScheduleConfig)
    private readonly configRepo: Repository<DoctorScheduleConfig>,
  ) {}

  async book(patientId: number, dto: BookAppointmentDto) {
    const config = await this.configRepo.findOne({
      where: { doctorId: dto.doctorId },
    });

    if (!config) {
      throw new NotFoundException('Doctor scheduling config not found');
    }

    this.validateFutureDate(dto.appointmentDate);

  if (config.schedulingType === SchedulingType.STREAM) {
  return this.bookStream(patientId, dto, config.schedulingType);
}

if (config.schedulingType === SchedulingType.WAVE) {
  return this.bookWave(patientId, dto, config);
}

    throw new BadRequestException('Unsupported scheduling type');
  }

  private validateFutureDate(date: string) {
    const today = new Date();
    const input = new Date(date);
    today.setHours(0, 0, 0, 0);
    input.setHours(0, 0, 0, 0);

    if (input < today) {
      throw new BadRequestException('Appointment date cannot be in the past');
    }
  }

  private async bookStream(
    patientId: number,
    dto: BookAppointmentDto,
    schedulingType: SchedulingType,
  ) {
    const lastToken = await this.appointmentRepo
      .createQueryBuilder('a')
      .select('MAX(a.tokenNumber)', 'max')
      .where('a.doctorId = :doctorId', { doctorId: dto.doctorId })
      .andWhere('a.appointmentDate = :appointmentDate', {
        appointmentDate: dto.appointmentDate,
      })
      .andWhere('a.schedulingType = :schedulingType', { schedulingType })
      .getRawOne();

    const tokenNumber = (Number(lastToken?.max) || 0) + 1;

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId,
      appointmentDate: dto.appointmentDate,
      schedulingType,
      startTime: null,
      endTime: null,
      waveWindowStart: null,
      waveWindowEnd: null,
      tokenNumber,
      status: 'BOOKED',
    });

    return this.appointmentRepo.save(appointment);
  }

  private async bookSlot(
    patientId: number,
    dto: BookAppointmentDto,
    schedulingType: SchedulingType,
  ) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException('startTime and endTime are required for SLOT');
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const conflict = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: dto.doctorId })
      .andWhere('a.appointmentDate = :appointmentDate', {
        appointmentDate: dto.appointmentDate,
      })
      .andWhere('a.status IN (:...statuses)', {
        statuses: ['BOOKED', 'CONFIRMED'],
      })
      .andWhere(':startTime < a.endTime', { startTime: dto.startTime })
      .andWhere(':endTime > a.startTime', { endTime: dto.endTime })
      .getOne();

    if (conflict) {
      throw new BadRequestException('Selected time slot is already booked');
    }

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId,
      appointmentDate: dto.appointmentDate,
      schedulingType,
      startTime: dto.startTime,
      endTime: dto.endTime,
      waveWindowStart: null,
      waveWindowEnd: null,
      tokenNumber: null,
      status: 'BOOKED',
    });

    return this.appointmentRepo.save(appointment);
  }

  private async bookWave(
    patientId: number,
    dto: BookAppointmentDto,
    config: DoctorScheduleConfig,
  ) {
    if (!dto.waveWindowStart || !dto.waveWindowEnd) {
      throw new BadRequestException(
        'waveWindowStart and waveWindowEnd are required for WAVE',
      );
    }

    if (dto.waveWindowStart >= dto.waveWindowEnd) {
      throw new BadRequestException('waveWindowEnd must be after waveWindowStart');
    }

    const count = await this.appointmentRepo.count({
      where: {
        doctorId: dto.doctorId,
        appointmentDate: dto.appointmentDate,
        waveWindowStart: dto.waveWindowStart,
        waveWindowEnd: dto.waveWindowEnd,
        status: 'BOOKED',
      },
    });

    if (config.maxCapacity && count >= config.maxCapacity) {
      throw new BadRequestException('Wave capacity reached');
    }

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId,
      appointmentDate: dto.appointmentDate,
      schedulingType: config.schedulingType,
      startTime: null,
      endTime: null,
      waveWindowStart: dto.waveWindowStart,
      waveWindowEnd: dto.waveWindowEnd,
      tokenNumber: null,
      status: 'BOOKED',
    });

    return this.appointmentRepo.save(appointment);
  }
}