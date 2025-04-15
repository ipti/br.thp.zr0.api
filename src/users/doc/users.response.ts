import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  MaxLength
} from 'class-validator';

export class UserResponse {
  @ApiProperty({ description: "User's id" })
  id: string;

  @IsNotEmpty()
  @MaxLength(150)
  @ApiProperty()
  name: string;

  @IsNotEmpty()
  @ApiProperty()
  email: string;

  @IsOptional()
  @ApiProperty({ required: false, default: true })
  active?: boolean;
}
