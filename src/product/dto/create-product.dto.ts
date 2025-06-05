import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength
} from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @ApiProperty()
  description: string;

  @IsOptional()
  @IsString()
  @ApiProperty()
  price: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  idCategory: string;
}
