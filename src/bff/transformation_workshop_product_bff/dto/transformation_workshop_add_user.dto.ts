import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional
} from 'class-validator';

export class AddProductTransformationWorkshopDto {
  @IsOptional()
  @IsNumber()
  @ApiProperty()
  product_fk?: number;

  @IsOptional()
  @IsNumber()
  @ApiProperty()
  tw_fk?: number;
}
