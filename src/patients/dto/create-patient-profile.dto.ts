import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreatePatientProfileDto {
  @IsString() @IsNotEmpty() fullName!: string;
  @IsInt() @Min(0) age!: number;
  @IsString() @IsNotEmpty() gender!: string;
  @IsString() @IsNotEmpty() contactDetails!: string;
  @IsOptional() @IsString() basicHealthInformation?: string;
}