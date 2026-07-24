import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { Role } from '../auth/enums/role.enum';
import { DoctorsService } from './doctors.service';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post('profile')
  createProfile(@Req() req: any, @Body() dto: CreateDoctorProfileDto) {
    return this.doctorsService.create(req.user.id, dto);
  }

  @Get('profile')
  getProfile(@Req() req: any) {
    return this.doctorsService.getByUserId(req.user.id);
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateDoctorProfileDto) {
    return this.doctorsService.update(req.user.id, dto);
  }
}