import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Doctor } from '../../doctors/doctors.entity';
import { User } from '../../users/user.entity';
import { SchedulingType } from '../../doctor-scheduling/enums/scheduling-type.enum';

@Entity('appointments')
@Index(['doctorId', 'appointmentDate'])
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'doctor_id', type: 'int' })
  doctorId!: number;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'patient_id', type: 'int' })
  patientId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: User;

  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate!: string;

  @Column({ name: 'scheduling_type', type: 'varchar', length: 20 })
  schedulingType!: SchedulingType;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime!: string | null;

  @Column({ name: 'wave_window_start', type: 'time', nullable: true })
  waveWindowStart!: string | null;

  @Column({ name: 'wave_window_end', type: 'time', nullable: true })
  waveWindowEnd!: string | null;

  @Column({ name: 'token_number', type: 'int', nullable: true })
  tokenNumber!: number | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'BOOKED' })
  status!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}