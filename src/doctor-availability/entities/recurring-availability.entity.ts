import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { DayOfWeek } from "../day-of-week.enum";
import { Doctor } from "../../doctors/doctors.entity";

@Entity("recurring_availability")
@Index(["doctorId", "dayOfWeek"])
export class RecurringAvailability {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "doctor_id", type: "int" })
  doctorId!: number;

  @ManyToOne(() => Doctor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_id" })
  doctor!: Doctor;

  @Column({ name: "day_of_week", type: "varchar", length: 20 })
  dayOfWeek!: DayOfWeek;

  @Column({ name: "start_time", type: "time" })
  startTime!: string;

  @Column({ name: "end_time", type: "time" })
  endTime!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}