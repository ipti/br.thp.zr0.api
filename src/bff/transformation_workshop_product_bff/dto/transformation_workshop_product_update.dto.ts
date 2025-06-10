import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber
} from 'class-validator';

export class ProductTransformationWorkshopUpdateDto {
 
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  quantity: number;
}
