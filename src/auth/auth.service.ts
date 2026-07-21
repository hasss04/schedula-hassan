import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../users/user.entity';
import { Doctor } from '../doctors/doctors.entity';
import { Patient } from '../patients/patients.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
  ) {}

  async signup(signupDto: SignupDto) {
    const existingUser = await this.usersService.findByEmail(signupDto.email);

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    return await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        name: signupDto.name,
        email: signupDto.email,
        password: hashedPassword,
        role: signupDto.role,
      });

      const savedUser = await manager.save(User, user);

      let profile: Doctor | Patient | null = null;

      if (signupDto.role === UserRole.DOCTOR) {
        const doctor = manager.create(Doctor, {
          userId: savedUser.id,
          fullName: signupDto.name,
          registrationId: signupDto.registrationId,
          qualificationSummary: signupDto.qualificationSummary,
          specialization: signupDto.specialization,
          yearsOfExperience: 0,
        });

        profile = await manager.save(Doctor, doctor);
      }

      if (signupDto.role === UserRole.PATIENT) {
        const patient = manager.create(Patient, {
          userId: savedUser.id,
          fullName: signupDto.name,
        });

        profile = await manager.save(Patient, patient);
      }

      return {
        message: 'User registered successfully',
        user: {
          id: savedUser.id,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
        },
        profile,
      };
    });
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      message: 'Login successful',
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}