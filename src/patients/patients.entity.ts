import { CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'user_id', unique: true })
  userId!: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'full_name', length: 120 })
  fullName!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}