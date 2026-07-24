import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Role } from '../auth/enums/role.enum';
import { PatientsService } from './patients.service';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('profile')
  createProfile(@Req() req: any, @Body() dto: CreatePatientProfileDto) {
    return this.patientsService.create(req.user.id, dto);
  }

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.patientsService.getByUserId(req.user.id);
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdatePatientProfileDto) {
    return this.patientsService.update(req.user.id, dto);
  }
}