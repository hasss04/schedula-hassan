import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class RescheduleAppointmentDto {
  @IsInt()
  @Min(1)
  doctorId!: number;

  @IsDateString()
  appointmentDate!: string;

  /*
   * STREAM and WAVE currently use startTime + endTime.
   * ELASTIC uses startTime + duration.
   */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime?: string;

  /*
   * Required only for ELASTIC rescheduling.
   * Must be a multiple of the doctor's slotDuration.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}