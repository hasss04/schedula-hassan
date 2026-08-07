import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';

export class RescheduleAppointmentDto {
  @IsInt()
  @Min(1)
  doctorId!: number;

  @IsDateString()
  appointmentDate!: string;

  // For STREAM rescheduling (concrete time slot)
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @ValidateIf((o) => !o.waveWindowStart && !o.waveWindowEnd)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @ValidateIf((o) => !o.waveWindowStart && !o.waveWindowEnd)
  endTime?: string;

  // For WAVE rescheduling
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @ValidateIf((o) => !o.startTime && !o.endTime)
  waveWindowStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @ValidateIf((o) => !o.startTime && !o.endTime)
  waveWindowEnd?: string;
}