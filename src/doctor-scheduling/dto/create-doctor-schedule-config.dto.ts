import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SchedulingType } from '../enums/scheduling-type.enum';

export class CreateDoctorScheduleConfigDto {
  @IsEnum(SchedulingType)
  schedulingType!: SchedulingType;

  @IsOptional()
  @IsInt()
  @Min(1)
  slotDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxCapacity?: number;
}