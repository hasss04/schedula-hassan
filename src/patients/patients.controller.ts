import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('patient')
export class PatientController {
  @Get('profile')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('PATIENT')
  getPatientProfile(@Req() req: any) {
    return {
      message: 'Welcome Patient',
      user: req.user,
    };
  }
}