import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class AddProductTransformationWorkshopDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  product_fk: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  tw_fk: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  quantity: number;
}
