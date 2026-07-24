import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class BookAppointmentDto {
  @IsInt()
  @Min(1)
  doctorId!: number;

  @IsDateString()
  appointmentDate!: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  waveWindowStart?: string;

  @IsOptional()
  @IsString()
  waveWindowEnd?: string;
}