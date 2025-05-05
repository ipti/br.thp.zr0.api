import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength
} from 'class-validator';

export class RecoveryPasswordDto {
  
  @IsNotEmpty()
  @MaxLength(45)
  @IsString()
  @ApiProperty()
  password: string;
}
