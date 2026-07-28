import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DoctorSchedulingService } from './doctor-scheduling.service';
import { CreateDoctorScheduleConfigDto } from './dto/create-doctor-schedule-config.dto';
import { UpdateDoctorScheduleConfigDto } from './dto/update-doctor-schedule-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('doctor/scheduling-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorSchedulingController {
  constructor(
    private readonly doctorSchedulingService: DoctorSchedulingService,
  ) {}

  @Post()
  create(@Req() req, @Body() dto: CreateDoctorScheduleConfigDto) {
    return this.doctorSchedulingService.createForDoctor(req.user.id, dto);
  }

  @Get()
  getMine(@Req() req) {
    return this.doctorSchedulingService.getForDoctor(req.user.id);
  }

  @Patch()
  update(@Req() req, @Body() dto: UpdateDoctorScheduleConfigDto) {
    return this.doctorSchedulingService.updateForDoctor(req.user.id, dto);
  }
}