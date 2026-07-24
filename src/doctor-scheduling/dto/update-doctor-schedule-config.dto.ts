import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorScheduleConfigDto } from './create-doctor-schedule-config.dto';

export class UpdateDoctorScheduleConfigDto extends PartialType(CreateDoctorScheduleConfigDto) {}