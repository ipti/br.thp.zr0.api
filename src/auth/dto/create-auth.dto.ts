import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateAuthDto {
  @IsNotEmpty()
  @MinLength(5)
  @IsString()
  @ApiProperty({
    minLength: 4,

    required: true,
    description: "User's email",
  })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(5, {
    message: 'Senha muito curta',
  })
  @ApiProperty({
    minLength: 8,

    required: true,
    description: "User's password",
  })
  password: string;
}
