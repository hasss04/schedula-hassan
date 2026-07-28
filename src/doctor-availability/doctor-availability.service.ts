import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { CustomAvailability } from './entities/custom-availability.entity';
import { CreateRecurringAvailabilityDto } from './dto/create-recurring-availability.dto';
import { UpdateRecurringAvailabilityDto } from './dto/update-recurring-availability.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { DayOfWeek } from './day-of-week.enum';
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
export class DoctorAvailabilityService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  private validateTimeRange(startTime: string, endTime: string) {
    if (toMinutes(startTime) >= toMinutes(endTime)) {
      throw new BadRequestException(
        'Invalid time range: startTime must be before endTime',
      );
    }
  }

  private hasOverlap(
    startTime: string,
    endTime: string,
    existing: { startTime: string; endTime: string }[],
  ): boolean {
    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    return existing.some((slot) => {
      const existingStart = toMinutes(slot.startTime);
      const existingEnd = toMinutes(slot.endTime);
      return newStart < existingEnd && existingStart < newEnd;
    });
  }

  private async getDoctorIdFromUserId(userId: number): Promise<number> {
    const doctor = await this.doctorRepo.findOne({
      where: { userId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found for this user');
    }

    return doctor.id;
  }

  async createRecurring(
    userId: number,
    dto: CreateRecurringAvailabilityDto,
  ) {
    const doctorId = await this.getDoctorIdFromUserId(userId);

    this.validateTimeRange(dto.startTime, dto.endTime);

    const existingForDay = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek: dto.dayOfWeek },
    });

    const isDuplicate = existingForDay.some(
      (slot) =>
        slot.startTime === dto.startTime && slot.endTime === dto.endTime,
    );

    if (isDuplicate) {
      throw new ConflictException(
        'Duplicate availability entry for this day and time',
      );
    }

    if (this.hasOverlap(dto.startTime, dto.endTime, existingForDay)) {
      throw new ConflictException(
        'This time slot overlaps with an existing availability slot',
      );
    }

    const entity = this.recurringRepo.create({
      doctorId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    return this.recurringRepo.save(entity);
  }

  async getAllRecurring(userId: number) {
    const doctorId = await this.getDoctorIdFromUserId(userId);

    return this.recurringRepo.find({
      where: { doctorId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async updateRecurring(
    userId: number,
    id: number,
    dto: UpdateRecurringAvailabilityDto,
  ) {
    const doctorId = await this.getDoctorIdFromUserId(userId);

    const existing = await this.recurringRepo.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Availability slot not found');
    }

    if (existing.doctorId !== doctorId) {
      throw new ForbiddenException(
        'You are not authorized to modify this availability slot',
      );
    }

    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;

    this.validateTimeRange(startTime, endTime);

    const siblingSlots = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek },
    });

    const otherSlots = siblingSlots.filter((slot) => slot.id !== id);

    const isDuplicate = otherSlots.some(
      (slot) => slot.startTime === startTime && slot.endTime === endTime,
    );

    if (isDuplicate) {
      throw new ConflictException(
        'Duplicate availability entry for this day and time',
      );
    }

    if (this.hasOverlap(startTime, endTime, otherSlots)) {
      throw new ConflictException(
        'This time slot overlaps with an existing availability slot',
      );
    }

    existing.startTime = startTime;
    existing.endTime = endTime;
    existing.dayOfWeek = dayOfWeek;

    return this.recurringRepo.save(existing);
  }

  async deleteRecurring(userId: number, id: number) {
    const doctorId = await this.getDoctorIdFromUserId(userId);

    const existing = await this.recurringRepo.findOne({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Availability slot not found');
    }

    if (existing.doctorId !== doctorId) {
      throw new ForbiddenException(
        'You are not authorized to delete this availability slot',
      );
    }

    await this.recurringRepo.remove(existing);
    return { success: true, message: 'Availability slot deleted successfully' };
  }

  async createOverride(userId: number, dto: CreateOverrideDto) {
    const doctorId = await this.getDoctorIdFromUserId(userId);

    if (!isValidDate(dto.date)) {
      throw new BadRequestException('Invalid date. Use YYYY-MM-DD format');
    }

    this.validateTimeRange(dto.startTime, dto.endTime);

    const existingForDate = await this.customRepo.find({
      where: { doctorId, date: dto.date },
    });

    const isDuplicate = existingForDate.some(
      (slot) =>
        slot.startTime === dto.startTime && slot.endTime === dto.endTime,
    );

    if (isDuplicate) {
      throw new ConflictException(
        'Duplicate override entry for this date and time',
      );
    }

    if (this.hasOverlap(dto.startTime, dto.endTime, existingForDate)) {
      throw new ConflictException(
        'This override time slot overlaps with an existing override for this date',
      );
    }

    const entity = this.customRepo.create({
      doctorId,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    return this.customRepo.save(entity);
  }

  async getAvailabilityForDate(userId: number, date: string) {
    const doctorId = await this.getDoctorIdFromUserId(userId);

    if (!isValidDate(date)) {
      throw new BadRequestException('Invalid date. Use YYYY-MM-DD format');
    }

    const overrides = await this.customRepo.find({
      where: { doctorId, date },
      order: { startTime: 'ASC' },
    });

    if (overrides.length > 0) {
      return {
        date,
        source: 'override',
        slots: overrides.map((o) => ({
          startTime: o.startTime,
          endTime: o.endTime,
        })),
      };
    }

    const dayOfWeek = getDayOfWeekFromDate(date);
    const recurring = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek },
      order: { startTime: 'ASC' },
    });

    return {
      date,
      source: 'recurring',
      dayOfWeek,
      slots: recurring.map((r) => ({
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    };
  }
}