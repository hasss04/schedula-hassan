import { IsNotEmpty, Matches } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateOverrideDto {
  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime!: string;
}