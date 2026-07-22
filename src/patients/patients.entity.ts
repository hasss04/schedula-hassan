import {
  Column, CreateDateColumn, Entity, JoinColumn, OneToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('patient_profiles')
export class Patient {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ name: 'user_id', unique: true }) userId!: number;
  @OneToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ name: 'full_name', length: 120 }) fullName!: string;
  @Column({ type: 'int' }) age!: number;
  @Column({ length: 20 }) gender!: string;
  @Column({ name: 'contact_details', type: 'text' }) contactDetails!: string;
  @Column({ name: 'basic_health_information', type: 'text', nullable: true }) basicHealthInformation?: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}