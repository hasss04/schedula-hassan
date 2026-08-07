import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto'; // NEW
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  book(@Req() req, @Body() dto: BookAppointmentDto) {
    return this.appointmentsService.book(req.user.id, dto);
  }

  @Get('appointments/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  getMyAppointments(@Req() req) {
    return this.appointmentsService.getMyAppointments(req.user.id);
  }

  @Patch('appointments/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  cancelAppointment(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.appointmentsService.cancelAppointment(req.user.id, id);
  }

  // reschedule endpoint
  @Patch('appointments/:id/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  rescheduleAppointment(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(req.user.id, id, dto);
  }

  @Get('doctor/appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  getDoctorAppointments(@Req() req) {
    return this.appointmentsService.getDoctorAppointments(req.user.id);
  }
}