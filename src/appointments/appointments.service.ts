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
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { DoctorScheduleConfig } from '../doctor-scheduling/entities/doctor-schedule-config.entity';
import { SchedulingType } from '../doctor-scheduling/enums/scheduling-type.enum';
import { RecurringAvailability } from '../doctor-availability/entities/recurring-availability.entity';
import { CustomAvailability } from '../doctor-availability/entities/custom-availability.entity';
import { DayOfWeek } from '../doctor-availability/day-of-week.enum';
import { AppointmentStatus } from './enums/appointment-status.enum';
import { Doctor } from '../doctors/doctors.entity';

type AvailabilitySlot = {
  startTime: string;
  endTime: string;
};

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === dateStr;
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

  const date = new Date(`${dateStr}T00:00:00Z`);
  return days[date.getUTCDay()];
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

    await this.ensureDoctorExists(dto.doctorId);

    const config = await this.configRepo.findOne({
      where: { doctorId: dto.doctorId },
    });

    if (!config) {
      throw new NotFoundException('Doctor scheduling config not found');
    }

    const availability = await this.getEffectiveAvailability(
      dto.doctorId,
      dto.appointmentDate,
    );

    if (availability.length === 0) {
      throw new BadRequestException(
        'Doctor is not available on the selected date',
      );
    }

    if (config.schedulingType === SchedulingType.STREAM) {
      return this.bookStream(patientId, dto, config, availability);
    }

    if (config.schedulingType === SchedulingType.WAVE) {
      return this.bookWave(patientId, dto, config, availability);
    }

    if (config.schedulingType === SchedulingType.ELASTIC) {
      return this.bookElastic(patientId, dto, config, availability);
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
    this.ensureWithinCutoff(appointment);

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

  async reschedule(
    patientId: number,
    appointmentId: number,
    dto: RescheduleAppointmentDto,
  ) {
    if (!isValidDate(dto.appointmentDate)) {
      throw new BadRequestException('Invalid appointment date');
    }

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.patientId !== patientId) {
      throw new ForbiddenException(
        'You are not allowed to reschedule this appointment',
      );
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        'Cancelled appointments cannot be rescheduled',
      );
    }

    /*
     * Rescheduling keeps the same doctor.
     * Booking another doctor is a new appointment, not a reschedule.
     */
    if (appointment.doctorId !== dto.doctorId) {
      throw new BadRequestException(
        'Appointment cannot be rescheduled to a different doctor',
      );
    }

    this.validateFutureDate(dto.appointmentDate);
    this.ensureWithinCutoff(appointment);

    await this.ensureDoctorExists(dto.doctorId);

    const config = await this.configRepo.findOne({
      where: { doctorId: dto.doctorId },
    });

    if (!config) {
      throw new NotFoundException('Doctor scheduling config not found');
    }

    const availability = await this.getEffectiveAvailability(
      dto.doctorId,
      dto.appointmentDate,
    );

    if (availability.length === 0) {
      const suggestion = await this.suggestNextAvailable(
        dto.doctorId,
        dto.appointmentDate,
      );

      throw new BadRequestException({
        message: 'Doctor is not available on the selected date',
        suggestion,
      });
    }

    if (config.schedulingType === SchedulingType.STREAM) {
      return this.rescheduleStream(appointment, dto, availability);
    }

    if (config.schedulingType === SchedulingType.WAVE) {
      return this.rescheduleWave(appointment, dto, config, availability);
    }

    if (config.schedulingType === SchedulingType.ELASTIC) {
      return this.rescheduleElastic(appointment, dto, config, availability);
    }

    throw new BadRequestException('Unsupported scheduling type');
  }

  private async ensureDoctorExists(doctorId: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return doctor;
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

  private ensureFutureDateTime(date: string, startTime: string) {
    const requestedDateTime = new Date(`${date}T${startTime}:00`);

    if (Number.isNaN(requestedDateTime.getTime())) {
      throw new BadRequestException('Invalid appointment date or start time');
    }

    if (requestedDateTime <= new Date()) {
      throw new BadRequestException(
        'Appointment start time must be in the future',
      );
    }
  }

  private ensureWithinCutoff(appointment: Appointment) {
    const now = new Date();

    let appointmentStart: Date;

    if (appointment.startTime) {
      appointmentStart = new Date(
        `${appointment.appointmentDate}T${appointment.startTime}:00`,
      );
    } else if (appointment.waveWindowStart) {
      appointmentStart = new Date(
        `${appointment.appointmentDate}T${appointment.waveWindowStart}:00`,
      );
    } else {
      appointmentStart = new Date(`${appointment.appointmentDate}T00:00:00`);
    }

    const differenceInMinutes =
      (appointmentStart.getTime() - now.getTime()) / (1000 * 60);

    if (differenceInMinutes < 30) {
      throw new BadRequestException(
        'Cannot cancel or reschedule an appointment within 30 minutes of start time',
      );
    }
  }

  private minutesToTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours < 0 || hours > 23) {
      throw new BadRequestException(
        'Appointment must start and end within the same day',
      );
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private getElasticReservedEndTime(
    startTime: string,
    duration: number,
    bufferTime: number,
  ): string {
    const totalMinutes = toMinutes(startTime) + duration + bufferTime;

    return this.minutesToTime(totalMinutes);
  }

  private async getEffectiveAvailability(
    doctorId: number,
    date: string,
  ): Promise<AvailabilitySlot[]> {
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

  private async suggestNextAvailable(doctorId: number, date: string) {
    const maxDaysAhead = 7;

    for (let offset = 0; offset <= maxDaysAhead; offset++) {
      const currentDate = new Date(`${date}T00:00:00`);
      currentDate.setDate(currentDate.getDate() + offset);

      const dateString = currentDate.toISOString().slice(0, 10);

      const slots = await this.getEffectiveAvailability(doctorId, dateString);

      if (slots.length > 0) {
        return {
          date: dateString,
          slots,
        };
      }
    }

    return null;
  }

  private fitsWithinAvailability(
    startTime: string,
    endTime: string,
    slots: AvailabilitySlot[],
  ): boolean {
    const start = toMinutes(startTime);
    const end = toMinutes(endTime);

    return slots.some((slot) => {
      const availableStart = toMinutes(slot.startTime);
      const availableEnd = toMinutes(slot.endTime);

      return start >= availableStart && end <= availableEnd;
    });
  }

  private async getNextTokenForSlotBasedScheduling(
    doctorId: number,
    appointmentDate: string,
  ): Promise<number> {
    const last = await this.appointmentRepo
      .createQueryBuilder('a')
      .select('MAX(a.tokenNumber)', 'max')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.appointmentDate = :appointmentDate', {
        appointmentDate,
      })
      .andWhere('a.schedulingType IN (:...schedulingTypes)', {
        schedulingTypes: [
          SchedulingType.STREAM,
          SchedulingType.ELASTIC,
        ],
      })
      .getRawOne();

    return (Number(last?.max) || 0) + 1;
  }

  private async findSlotConflict(
    doctorId: number,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: number,
  ) {
    const query = this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.appointmentDate = :appointmentDate', {
        appointmentDate,
      })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.BOOKED,
          AppointmentStatus.CONFIRMED,
        ],
      })
      .andWhere('a.schedulingType IN (:...schedulingTypes)', {
        schedulingTypes: [
          SchedulingType.STREAM,
          SchedulingType.ELASTIC,
        ],
      })
      .andWhere(':startTime < a.endTime', { startTime })
      .andWhere(':endTime > a.startTime', { endTime });

    if (excludeAppointmentId) {
      query.andWhere('a.id != :excludeAppointmentId', {
        excludeAppointmentId,
      });
    }

    return query.getOne();
  }

  private async getActiveWaveCount(
    doctorId: number,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: number,
  ) {
    const query = this.appointmentRepo
      .createQueryBuilder('a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.appointmentDate = :appointmentDate', {
        appointmentDate,
      })
      .andWhere('a.schedulingType = :schedulingType', {
        schedulingType: SchedulingType.WAVE,
      })
      .andWhere('a.waveWindowStart = :startTime', {
        startTime,
      })
      .andWhere('a.waveWindowEnd = :endTime', {
        endTime,
      })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.BOOKED,
          AppointmentStatus.CONFIRMED,
        ],
      });

    if (excludeAppointmentId) {
      query.andWhere('a.id != :excludeAppointmentId', {
        excludeAppointmentId,
      });
    }

    return query.getCount();
  }

  private async bookStream(
    patientId: number,
    dto: BookAppointmentDto,
    config: DoctorScheduleConfig,
    availability: AvailabilitySlot[],
  ) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException(
        'startTime and endTime are required for STREAM booking',
      );
    }

    if (toMinutes(dto.startTime) >= toMinutes(dto.endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    this.ensureFutureDateTime(dto.appointmentDate, dto.startTime);

    if (!this.fitsWithinAvailability(dto.startTime, dto.endTime, availability)) {
      throw new BadRequestException(
        'Selected stream slot is outside doctor availability',
      );
    }

    if (config.bufferTime !== null && config.bufferTime < 0) {
      throw new BadRequestException('Invalid STREAM configuration');
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

    const conflict = await this.findSlotConflict(
      dto.doctorId,
      dto.appointmentDate,
      dto.startTime,
      dto.endTime,
    );

    if (conflict) {
      throw new BadRequestException('Selected time slot is already booked');
    }

    const tokenNumber = await this.getNextTokenForSlotBasedScheduling(
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
    availability: AvailabilitySlot[],
  ) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException(
        'startTime and endTime are required for WAVE booking',
      );
    }

    if (toMinutes(dto.startTime) >= toMinutes(dto.endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    this.ensureFutureDateTime(dto.appointmentDate, dto.startTime);

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

    const count = await this.getActiveWaveCount(
      dto.doctorId,
      dto.appointmentDate,
      dto.startTime,
      dto.endTime,
    );

    if (count >= config.maxCapacity) {
      throw new BadRequestException('Wave capacity reached');
    }

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId,
      appointmentDate: dto.appointmentDate,
      schedulingType: SchedulingType.WAVE,
      startTime: null,
      endTime: null,
      waveWindowStart: dto.startTime,
      waveWindowEnd: dto.endTime,
      tokenNumber: count + 1,
      status: AppointmentStatus.BOOKED,
    });

    return this.appointmentRepo.save(appointment);
  }

  private async bookElastic(
    patientId: number,
    dto: BookAppointmentDto,
    config: DoctorScheduleConfig,
    availability: AvailabilitySlot[],
  ) {
    if (!dto.startTime) {
      throw new BadRequestException(
        'startTime is required for ELASTIC booking',
      );
    }

    if (!dto.duration) {
      throw new BadRequestException(
        'duration is required for ELASTIC booking',
      );
    }

    if (!config.slotDuration || config.slotDuration <= 0) {
      throw new BadRequestException(
        'Doctor ELASTIC configuration is invalid: slotDuration is required',
      );
    }

    const bufferTime = config.bufferTime ?? 0;

    if (bufferTime < 0) {
      throw new BadRequestException(
        'Doctor ELASTIC configuration is invalid: bufferTime cannot be negative',
      );
    }

    if (dto.duration % config.slotDuration !== 0) {
      throw new BadRequestException(
        `Duration must be a multiple of ${config.slotDuration} minutes`,
      );
    }

    this.ensureFutureDateTime(dto.appointmentDate, dto.startTime);

    const reservedEndTime = this.getElasticReservedEndTime(
      dto.startTime,
      dto.duration,
      bufferTime,
    );

    if (
      !this.fitsWithinAvailability(
        dto.startTime,
        reservedEndTime,
        availability,
      )
    ) {
      throw new BadRequestException(
        'Requested ELASTIC appointment duration is outside doctor availability',
      );
    }

    const duplicate = await this.appointmentRepo.findOne({
      where: {
        doctorId: dto.doctorId,
        patientId,
        appointmentDate: dto.appointmentDate,
        startTime: dto.startTime,
        endTime: reservedEndTime,
        status: AppointmentStatus.BOOKED,
      },
    });

    if (duplicate) {
      throw new BadRequestException('Duplicate booking is not allowed');
    }

    const conflict = await this.findSlotConflict(
      dto.doctorId,
      dto.appointmentDate,
      dto.startTime,
      reservedEndTime,
    );

    if (conflict) {
      throw new BadRequestException(
        'Requested ELASTIC appointment overlaps an existing booking',
      );
    }

    const tokenNumber = await this.getNextTokenForSlotBasedScheduling(
      dto.doctorId,
      dto.appointmentDate,
    );

    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId,
      appointmentDate: dto.appointmentDate,
      schedulingType: SchedulingType.ELASTIC,
      startTime: dto.startTime,
      endTime: reservedEndTime,
      waveWindowStart: null,
      waveWindowEnd: null,
      tokenNumber,
      status: AppointmentStatus.BOOKED,
    });

    return this.appointmentRepo.save(appointment);
  }

  private async rescheduleStream(
    appointment: Appointment,
    dto: RescheduleAppointmentDto,
    availability: AvailabilitySlot[],
  ) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException(
        'startTime and endTime are required for STREAM rescheduling',
      );
    }

    if (toMinutes(dto.startTime) >= toMinutes(dto.endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    this.ensureFutureDateTime(dto.appointmentDate, dto.startTime);

    const isSameSlot =
      appointment.appointmentDate === dto.appointmentDate &&
      appointment.startTime === dto.startTime &&
      appointment.endTime === dto.endTime;

    if (isSameSlot) {
      throw new BadRequestException('Cannot reschedule to the same slot');
    }

    if (!this.fitsWithinAvailability(dto.startTime, dto.endTime, availability)) {
      const suggestion = await this.suggestNextAvailable(
        dto.doctorId,
        dto.appointmentDate,
      );

      throw new BadRequestException({
        message: 'Selected stream slot is outside doctor availability',
        suggestion,
      });
    }

    const conflict = await this.findSlotConflict(
      dto.doctorId,
      dto.appointmentDate,
      dto.startTime,
      dto.endTime,
      appointment.id,
    );

    if (conflict) {
      const suggestion = await this.suggestNextAvailable(
        dto.doctorId,
        dto.appointmentDate,
      );

      throw new BadRequestException({
        message: 'Selected time slot is already booked',
        suggestion,
      });
    }

    appointment.appointmentDate = dto.appointmentDate;
    appointment.schedulingType = SchedulingType.STREAM;
    appointment.startTime = dto.startTime;
    appointment.endTime = dto.endTime;
    appointment.waveWindowStart = null;
    appointment.waveWindowEnd = null;

    return this.appointmentRepo.save(appointment);
  }

  private async rescheduleWave(
    appointment: Appointment,
    dto: RescheduleAppointmentDto,
    config: DoctorScheduleConfig,
    availability: AvailabilitySlot[],
  ) {
    if (!dto.startTime || !dto.endTime) {
      throw new BadRequestException(
        'startTime and endTime are required for WAVE rescheduling',
      );
    }

    if (toMinutes(dto.startTime) >= toMinutes(dto.endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    this.ensureFutureDateTime(dto.appointmentDate, dto.startTime);

    if (
      !config.slotDuration ||
      config.slotDuration <= 0 ||
      !config.maxCapacity ||
      config.maxCapacity <= 0
    ) {
      throw new BadRequestException('Invalid WAVE configuration for doctor');
    }

    if (
      toMinutes(dto.endTime) - toMinutes(dto.startTime) !==
      config.slotDuration
    ) {
      throw new BadRequestException(
        `Wave window must match configured duration of ${config.slotDuration} minutes`,
      );
    }

    const isSameWave =
      appointment.appointmentDate === dto.appointmentDate &&
      appointment.waveWindowStart === dto.startTime &&
      appointment.waveWindowEnd === dto.endTime;

    if (isSameWave) {
      throw new BadRequestException('Cannot reschedule to the same wave');
    }

    if (!this.fitsWithinAvailability(dto.startTime, dto.endTime, availability)) {
      const suggestion = await this.suggestNextAvailable(
        dto.doctorId,
        dto.appointmentDate,
      );

      throw new BadRequestException({
        message: 'Selected wave window is outside doctor availability',
        suggestion,
      });
    }

    const count = await this.getActiveWaveCount(
      dto.doctorId,
      dto.appointmentDate,
      dto.startTime,
      dto.endTime,
      appointment.id,
    );

    if (count >= config.maxCapacity) {
      const suggestion = await this.suggestNextAvailable(
        dto.doctorId,
        dto.appointmentDate,
      );

      throw new BadRequestException({
        message: 'Wave capacity reached',
        suggestion,
      });
    }

    appointment.appointmentDate = dto.appointmentDate;
    appointment.schedulingType = SchedulingType.WAVE;
    appointment.startTime = null;
    appointment.endTime = null;
    appointment.waveWindowStart = dto.startTime;
    appointment.waveWindowEnd = dto.endTime;
    appointment.tokenNumber = count + 1;

    return this.appointmentRepo.save(appointment);
  }

  private async rescheduleElastic(
    appointment: Appointment,
    dto: RescheduleAppointmentDto,
    config: DoctorScheduleConfig,
    availability: AvailabilitySlot[],
  ) {
    if (!dto.startTime) {
      throw new BadRequestException(
        'startTime is required for ELASTIC rescheduling',
      );
    }

    if (!dto.duration) {
      throw new BadRequestException(
        'duration is required for ELASTIC rescheduling',
      );
    }

    if (!config.slotDuration || config.slotDuration <= 0) {
      throw new BadRequestException(
        'Doctor ELASTIC configuration is invalid: slotDuration is required',
      );
    }

    const bufferTime = config.bufferTime ?? 0;

    if (bufferTime < 0) {
      throw new BadRequestException(
        'Doctor ELASTIC configuration is invalid: bufferTime cannot be negative',
      );
    }

    if (dto.duration % config.slotDuration !== 0) {
      throw new BadRequestException(
        `Duration must be a multiple of ${config.slotDuration} minutes`,
      );
    }

    this.ensureFutureDateTime(dto.appointmentDate, dto.startTime);

    const reservedEndTime = this.getElasticReservedEndTime(
      dto.startTime,
      dto.duration,
      bufferTime,
    );

    const isSameSlot =
      appointment.appointmentDate === dto.appointmentDate &&
      appointment.startTime === dto.startTime &&
      appointment.endTime === reservedEndTime;

    if (isSameSlot) {
      throw new BadRequestException(
        'Cannot reschedule to the same ELASTIC appointment time',
      );
    }

    if (
      !this.fitsWithinAvailability(
        dto.startTime,
        reservedEndTime,
        availability,
      )
    ) {
      const suggestion = await this.suggestNextAvailable(
        dto.doctorId,
        dto.appointmentDate,
      );

      throw new BadRequestException({
        message: 'Requested ELASTIC appointment is outside doctor availability',
        suggestion,
      });
    }

    const conflict = await this.findSlotConflict(
      dto.doctorId,
      dto.appointmentDate,
      dto.startTime,
      reservedEndTime,
      appointment.id,
    );

    if (conflict) {
      const suggestion = await this.suggestNextAvailable(
        dto.doctorId,
        dto.appointmentDate,
      );

      throw new BadRequestException({
        message: 'Requested ELASTIC appointment overlaps an existing booking',
        suggestion,
      });
    }

    /*
     * All validations run before update.
     * Saving this record releases its old range and reserves the new range.
     */
    appointment.appointmentDate = dto.appointmentDate;
    appointment.schedulingType = SchedulingType.ELASTIC;
    appointment.startTime = dto.startTime;
    appointment.endTime = reservedEndTime;
    appointment.waveWindowStart = null;
    appointment.waveWindowEnd = null;

    return this.appointmentRepo.save(appointment);
  }
}