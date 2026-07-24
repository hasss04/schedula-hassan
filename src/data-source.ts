import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './users/user.entity';
import { Doctor } from './doctors/doctors.entity';
import { Patient } from './patients/patients.entity';
import { RecurringAvailability } from './doctor-availability/entities/recurring-availability.entity';
import { CustomAvailability } from './doctor-availability/entities/custom-availability.entity';
import { DoctorScheduleConfig } from './doctor-scheduling/entities/doctor-schedule-config.entity';
import { Appointment } from './appointments/entities/appointment.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Doctor,
    Patient,
    RecurringAvailability,
    CustomAvailability,
    DoctorScheduleConfig,
    Appointment,
  ],
  migrations: ['migrations/*.ts'],
  synchronize: false,
});