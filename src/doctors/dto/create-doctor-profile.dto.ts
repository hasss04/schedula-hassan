import { IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Min } from 'class-validator';

export class CreateDoctorProfileDto {
  @IsString() @IsNotEmpty() fullName!: string;
  @IsString() @IsNotEmpty() specialization!: string;
  @IsInt() @Min(0) experience!: number;
  @IsString() @IsNotEmpty() qualification!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() consultationFee!: number;
  @IsString() @IsNotEmpty() availability!: string;
  @IsString() @IsNotEmpty() profileDetails!: string;
}