import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength
} from 'class-validator';

export class SendEmailRecoveryPasswordDto {
  
  @IsNotEmpty()
  @Length(5, 128)
  @ApiProperty()
  email: string;
}
