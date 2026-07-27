import { IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { DayOfWeek } from '../day-of-week.enum';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateRecurringAvailabilityDto {
  @IsEnum(DayOfWeek, { message: 'dayOfWeek must be a valid day of the week' })
  dayOfWeek!: DayOfWeek;

  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime!: string;
}