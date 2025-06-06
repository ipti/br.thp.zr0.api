import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
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
  @IsNumber()
  @ApiProperty()
  price: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  idCategory: string;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  height;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  length;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  width;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  weight;
}
