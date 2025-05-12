import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  MaxLength
} from 'class-validator';

export class ProductResponse {
  @ApiProperty({ description: "Product's id" })
  id: string;

  @IsNotEmpty()
  @MaxLength(150)
  @ApiProperty()
  name: string;

  @IsOptional()
  @MaxLength(150)
  @ApiProperty()
  description: string;

  @IsOptional()
  @ApiProperty()
  price: number;

}
