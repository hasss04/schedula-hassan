import {
  Column, CreateDateColumn, Entity, JoinColumn, OneToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('doctor_profiles')
export class Doctor {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'user_id', unique: true }) userId!: number;
  @OneToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ name: 'full_name', length: 120 }) fullName!: string;
  @Column({ length: 150 }) specialization!: string;
  @Column({ type: 'int' }) experience!: number;
  @Column({ length: 255 }) qualification!: string;
  @Column({ name: 'consultation_fee', type: 'numeric', precision: 10, scale: 2 }) consultationFee!: number;
  @Column({ type: 'text' }) availability!: string;
  @Column({ name: 'profile_details', type: 'text' }) profileDetails!: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}