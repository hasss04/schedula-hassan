import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<User>) {
    const existing = await this.findByEmail(data.email as string);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = this.repo.create(data);
    return this.repo.save(user);
  }
}