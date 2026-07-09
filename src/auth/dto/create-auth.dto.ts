import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  @IsEmail()
  @IsString()
  @ApiProperty({
    required: true,
    description: "User's email",
  })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, {
    message: 'Senha muito curta',
  })
  @ApiProperty({
    minLength: 8,

    required: true,
    description: "User's password",
  })
  password: string;
}
