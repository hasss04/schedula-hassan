import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { DoctorAvailabilityService } from "./doctor-availability.service";
import { CreateRecurringAvailabilityDto } from "./dto/create-recurring-availability.dto";
import { UpdateRecurringAvailabilityDto } from "./dto/update-recurring-availability.dto";
import { CreateOverrideDto } from "./dto/create-override.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";

interface AuthenticatedRequest extends Request {
  user: { id: number; role: UserRole; [key: string]: any };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
@Controller("doctor/availability")
export class DoctorAvailabilityController {
  constructor(private readonly service: DoctorAvailabilityService) {}

  @Post()
  createRecurring(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateRecurringAvailabilityDto
  ) {
    return this.service.createRecurring(req.user.id, dto);
  }

  @Get()
  getAllRecurring(@Req() req: AuthenticatedRequest) {
    return this.service.getAllRecurring(req.user.id);
  }

  @Patch(":id")
  updateRecurring(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateRecurringAvailabilityDto
  ) {
    return this.service.updateRecurring(req.user.id, Number(id), dto);
  }

  @Delete(":id")
  deleteRecurring(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.service.deleteRecurring(req.user.id, Number(id));
  }

  @Post("override")
  createOverride(@Req() req: AuthenticatedRequest, @Body() dto: CreateOverrideDto) {
    return this.service.createOverride(req.user.id, dto);
  }

  @Get("date")
  getAvailabilityForDate(
    @Req() req: AuthenticatedRequest,
    @Query("date") date: string
  ) {
    return this.service.getAvailabilityForDate(req.user.id, date);
  }
}