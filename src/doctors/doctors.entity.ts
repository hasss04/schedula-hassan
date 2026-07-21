import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', unique: true })
  userId!: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'full_name', length: 120 })
  fullName!: string;

  @Column({ name: 'registration_id', length: 100, unique: true, nullable: true })
  registrationId?: string;

  @Column({ name: 'qualification_summary', length: 255, nullable: true })
  qualificationSummary?: string;

  @Column({ length: 150, nullable: true })
  specialization?: string;

  @Column({ name: 'years_of_experience', default: 0 })
  yearsOfExperience!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}