import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { DoctorScheduleConfig } from '../doctor-scheduling/entities/doctor-schedule-config.entity';
import { SchedulingType } from '../doctor-scheduling/enums/scheduling-type.enum';
import { RecurringAvailability } from '../doctor-availability/entities/recurring-availability.entity';
import { CustomAvailability } from '../doctor-availability/entities/custom-availability.entity';
import { DayOfWeek } from '../doctor-availability/day-of-week.enum';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { Doctor } from '../doctors/doctors.entity';

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isValidDate(dateStr: string): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === dateStr;
}

function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const days = [
    DayOfWeek.SUNDAY,
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
  ];
  const d = new Date(`${dateStr}T00:00:00Z`);
  return days[d.getUTCDay()];
}

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(DoctorScheduleConfig)
    private readonly configRepo: Repository<DoctorScheduleConfig>,

    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async book(patientId: number, dto: BookAppointmentDto) {
    if (!isValidDate(dto.appointmentDate)) {
      throw new BadRequestException('Invalid appointment date');
    }

    this.validateFutureDate(dto.appointmentDate);

    const config = await this.configRepo.findOne({
      where: { doctorId: dto.doctorId },
    });

    if (!config) {
      throw new NotFoundException('Doctor scheduling config not found');
    }

    const effectiveAvailability = await this.getEffectiveAvailability(
      dto.doctorId,
      dto.appointmentDate,
    );

    if (effectiveAvailability.length === 0) {
      throw new BadRequestException(
        'Doctor is not available on the selected date',
      );
    }

    if (config.schedulingType === SchedulingType.STREAM) {
      return this.bookStream(patientId, dto, config, effectiveAvailability);
    }

    if (config.schedulingType === SchedulingType.WAVE) {
      return this.bookWave(patientId, dto, config, effectiveAvailability);
    }

    throw new BadRequestException('Unsupported scheduling type');
  }

  async getMyAppointments(patientId: number) {
    const appointments = await this.appointmentRepo.find({
      where: { patientId },
      relations: {
        doctor: true,
      },
      order: {
        appointmentDate: 'DESC',
        createdAt: 'DESC',
      },
    });

    return {
      count: appointments.length,
      appointments,
    };
  }

  async cancelAppointment(patientId: number, appointmentId: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: {
        doctor: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== patientId) {
      throw new ForbiddenException(
        'You are not allowed to cancel this appointment',
      );
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    this.validateCancelableDate(appointment.appointmentDate);

    appointment.status = AppointmentStatus.CANCELLED;
    return this.appointmentRepo.save(appointment);
  }

  async getDoctorAppointments(userId: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const appointments = await this.appointmentRepo.find({
      where: { doctorId: doctor.id },
      relations: {
        patient: true,
        doctor: true,
      },
      order: {
        appointmentDate: 'DESC',
        createdAt: 'DESC',
      },
    });

    const sanitizedAppointments = appointments.map((appointment) => {
      const { patient, ...rest } = appointment;
      return {
        ...rest,
        patient: patient
          ? {
              id: patient.id,
              name: patient.name,
              email: patient.email,
              role: patient.role,
            }
          : null,
      };
    });

    return {
      count: sanitizedAppointments.length,
      appointments: sanitizedAppointments,
    };
  }

  private validateFutureDate(date: string) {
    const today = new Date();
    const input = new Date(`${date}T00:00:00`);
    today.setHours(0, 0, 0, 0);

    if (input < today) {
      throw new BadRequestException('Appointment date cannot be in the past');
    }
  }

  private validateCancelableDate(date: string) {
    const today = new Date();
    const input = new Date(`${date}T00:00:00`);
    today.setHours(0, 0, 0, 0);

    if (input < today) {
      throw new BadRequestException('Past appointments cannot be cancelled');
    }
  }

  private async getEffectiveAvailability(doctorId: number, date: string) {
    const overrides = await this.customRepo.find({
      where: { doctorId, date },
      order: { startTime: 'ASC' },
    });

    if (overrides.length > 0) {
      return overrides.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
    }

    const dayOfWeek = getDayOfWeekFromDate(date);
    const recurring = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek },
      order: { startTime: 'ASC' },
    });

    return recurring.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  }

  private fitsWithinAvailability(
    startTime: string,
    endTime: string,
    slots: { startTime: string; endTime: string }[],
  ): boolean {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    return slots.some((slot) => {
      const slotStart = toMinutes(slot.startTime);
      const slotEnd = toMinutes(slot.endTime);
      return start >= slotStart && end <= slotEnd;
    });
  }

  private async getNextTokenForStream(
    doctorId: number,
    appointmentDate: string,
  ): Promise<number> {
    const last = await this.appointmentRepo
      .createQueryBuilder('a')
      .select('MAX(a.tokenNumber)', 'max')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.appointmentDate = :appointmentDate', { appointmentDate })
      .andWhere('a.schedulingType = :schedulingType', {
        schedulingType: SchedulingType.STREAM,
      })
      .getRawOne();

    return (Number(last?.max) || 0) + 1;
  }

  private async bookStream(
    patientId: number,
    dto: BookAppointmentDto,
    config: DoctorScheduleConfig,
    availability: { startTime: string; endTime: string }[],
  ) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException(
        'startTime and endTime are required for STREAM booking',
      );
    }

    if (toMinutes(dto.startTime) >= toMinutes(dto.endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    if (!this.fitsWithinAvailability(dto.startTime, dto.endTime, availability)) {
      throw new BadRequestException(
        'Selected stream slot is outside doctor availability',
      );
    }

    if (
      config.bufferTime !== null &&
      config.bufferTime !== undefined &&
      config.bufferTime < 0
    ) {
      throw new BadRequestException('Invalid stream configuration');
    }

    const duplicate = await this.appointmentRepo.findOne({
      where: {
        doctorId: dto.doctorId,
        patientId,
        appointmentDate: dto.appointmentDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: AppointmentStatus.BOOKED,
      },
    });

    if (duplicate) {
      throw new BadRequestException('Duplicate booking is not allowed');
    }

    const conflict = await this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId: dto.doctorId })
      .andWhere('a.appointmentDate = :appointmentDate', {
        appointmentDate: dto.appointmentDate,
      })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AppointmentStatus.BOOKED, AppointmentStatus.CONFIRMED],
      })
      .andWhere('a.schedulingType = :schedulingType', {
        schedulingType: SchedulingType.STREAM,
      })
      .andWhere(':startTime < a.endTime', { startTime: dto.startTime })
      .andWhere(':endTime > a.startTime', { endTime: dto.endTime })
      .getOne();

    if (conflict) {
      throw new BadRequestException('Selected time slot is already booked');
    }

    const tokenNumber = await this.getNextTokenForStream(
      dto.doctorId,
      dto.appointmentDate,
    );

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId,
      appointmentDate: dto.appointmentDate,
      schedulingType: SchedulingType.STREAM,
      startTime: dto.startTime,
      endTime: dto.endTime,
      waveWindowStart: null,
      waveWindowEnd: null,
      tokenNumber,
      status: AppointmentStatus.BOOKED,
    });

    return this.appointmentRepo.save(appointment);
  }

  private async bookWave(
    patientId: number,
    dto: BookAppointmentDto,
    config: DoctorScheduleConfig,
    availability: { startTime: string; endTime: string }[],
  ) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException(
        'startTime and endTime are required for WAVE booking',
      );
    }

    if (toMinutes(dto.startTime) >= toMinutes(dto.endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    if (!config.slotDuration || config.slotDuration <= 0) {
      throw new BadRequestException(
        'Doctor WAVE configuration is invalid: slotDuration is required',
      );
    }

    if (!config.maxCapacity || config.maxCapacity <= 0) {
      throw new BadRequestException(
        'Doctor WAVE configuration is invalid: maxCapacity is required',
      );
    }

    if (
      toMinutes(dto.endTime) - toMinutes(dto.startTime) !==
      config.slotDuration
    ) {
      throw new BadRequestException(
        `Wave window must match configured duration of ${config.slotDuration} minutes`,
      );
    }

    if (!this.fitsWithinAvailability(dto.startTime, dto.endTime, availability)) {
      throw new BadRequestException(
        'Selected wave window is outside doctor availability',
      );
    }

    const duplicate = await this.appointmentRepo.findOne({
      where: {
        doctorId: dto.doctorId,
        patientId,
        appointmentDate: dto.appointmentDate,
        waveWindowStart: dto.startTime,
        waveWindowEnd: dto.endTime,
        status: AppointmentStatus.BOOKED,
      },
    });

    if (duplicate) {
      throw new BadRequestException('Duplicate booking is not allowed');
    }

    const count = await this.appointmentRepo.count({
      where: {
        doctorId: dto.doctorId,
        appointmentDate: dto.appointmentDate,
        waveWindowStart: dto.startTime,
        waveWindowEnd: dto.endTime,
        status: AppointmentStatus.BOOKED,
      },
    });

    if (count >= config.maxCapacity) {
      throw new BadRequestException('Wave capacity reached');
    }

    const tokenNumber = count + 1;

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId,
      appointmentDate: dto.appointmentDate,
      schedulingType: SchedulingType.WAVE,
      startTime: null,
      endTime: null,
      waveWindowStart: dto.startTime,
      waveWindowEnd: dto.endTime,
      tokenNumber,
      status: AppointmentStatus.BOOKED,
    });

    return this.appointmentRepo.save(appointment);
  }
}