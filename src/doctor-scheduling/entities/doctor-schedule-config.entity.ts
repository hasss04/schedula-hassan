import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from '../../doctors/doctors.entity';
import { SchedulingType } from '../enums/scheduling-type.enum';

@Entity('doctor_schedule_configs')
export class DoctorScheduleConfig {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'doctor_id', type: 'int', unique: true })
  doctorId!: number;

  @OneToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: Doctor;

  @Column({ name: 'scheduling_type', type: 'varchar', length: 20 })
  schedulingType!: SchedulingType;

  @Column({ name: 'slot_duration', type: 'int', nullable: true })
  slotDuration!: number | null;

  @Column({ name: 'buffer_time', type: 'int', nullable: true, default: 0 })
  bufferTime!: number | null;

  @Column({ name: 'max_capacity', type: 'int', nullable: true })
  maxCapacity!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}