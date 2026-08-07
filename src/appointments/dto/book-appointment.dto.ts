import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class BookAppointmentDto {
  @IsInt()
  @Min(1)
  doctorId!: number;

  @IsDateString()
  appointmentDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime?: string;

  /*
   * Required when the doctor uses ELASTIC scheduling.
   * Example: 15, 30, 45, 60.
   * Must be a multiple of the doctor's configured slotDuration.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}