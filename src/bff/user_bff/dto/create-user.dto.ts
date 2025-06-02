import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateUserBffDto {
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

  @IsOptional()
  @Length(5, 128)
  @ApiProperty()
  email: string;

  @IsNotEmpty()
  @ApiProperty()
  ot_fk: number;

  @IsNotEmpty()
  @MaxLength(45)
  @IsString()
  @ApiProperty()
  password: string;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, default: 1 })
  active?: boolean;

  @IsOptional()
  @IsEnum(Role)
  @ApiProperty({ required: false, default: Role.ADMIN })
  role?: Role;
}
