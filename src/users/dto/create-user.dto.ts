import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @ApiProperty()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(128)
  @ApiProperty()
  email: string;

  @IsNotEmpty()
  @MaxLength(45)
  @IsString()
  @MinLength(8)
  @ApiProperty()
  password: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, default: 1 })
  active?: boolean;
}

export class CreateUserAdminDto extends CreateUserDto {
  @IsOptional()
  @IsEnum(Role)
  @ApiProperty({ required: false, default: Role.ADMIN })
  role?: Role;
}
