import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ResendVerificationEmailDto {
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(128)
  @ApiProperty({ example: 'cliente@example.com' })
  email: string;
}
